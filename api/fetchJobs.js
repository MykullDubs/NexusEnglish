// api/fetchJobs.js
export default async function handler(req, res) {
  try {
    const headers = { 'User-Agent': 'LifeOS-GUI-V12/12.0' };

    // =========================================================
    // 1. PARSE REQUEST
    //    FIX: Next.js/Vercel already parses req.body as an object.
    //    Never call JSON.parse() on it — that throws on an object.
    // =========================================================
    const body       = req.body || {};
    const daysLimit  = parseInt(body.days)  || parseInt(req.query.days)  || 14;
    const page       = Math.max(1, parseInt(body.page) || parseInt(req.query.page) || 1);
    const pageSize   = 50;
    const cutoffDate = new Date(Date.now() - daysLimit * 24 * 60 * 60 * 1000).getTime();

    // =========================================================
    // 2. DYNAMIC BOUNCER — driven by the UI, safe defaults
    // =========================================================
    const rawVip       = body.vip       || 'instructional, curriculum, esl, edtech, e-learning, elearning, lxd, learning experience, educational, l&d, learning, education, trainer, training, subject matter expert, sme, course, bilingual, teacher, educator, lms, technologist, localization, linguist';
    const rawBanned    = body.banned    || 'machine learning, deep learning, sales, marketing, data scientist, backend, data engineer, account executive, customer success, manager, director, vp, head, principal, counsel, finance, payroll';
    const rawLocations = body.locations || 'uk only, europe, emea, apac, asia, uk/eu, india, australia, philippines';

    const vipList         = rawVip.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    const bannedList      = rawBanned.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    const bannedLocations = rawLocations.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

    // =========================================================
    // 3. SOURCE CONFIGURATIONS
    // =========================================================
    const greenhouseBoards = [
      'coursera', 'duolingo', 'masterclass', 'guildeducation', 'udemy',
      'quizlet', 'articulate', 'instructure', 'chegg', 'amplify',
      'ixllearning', 'teachable', 'thinkific', 'goguardian', 'betterup',
      'synthesis', 'degreed', 'coachhub', 'remind', 'mainstay',
      'preply', 'lingoda', 'elsa', 'busuu', 'hone', 'section', 'rivo',
      'cornerstone', 'learnupon', '360learning', 'absorblms', 'docebo',
      'skillshare', 'brainpop', 'newsela', 'datacamp', 'ageoflearning',
      'pluralsight', 'babbel', 'memrise', 'outlier', 'classdojo', 'nearpod'
    ];

    const leverBoards = [
      'outschool', 'khanacademy', 'edpuzzle', 'seesaw', 'varsitytutors',
      'paper', 'swingeducation', 'loora', 'kyronlearning', 'labster', 'springboard',
      'litmos', 'lessonly', 'highspot', 'workramp', 'cambly', 'kahoot', 'speak', 'slang'
    ];

    const workdayBoards = [
      { slug: '2u',         display: '2U'          },
      { slug: 'pearson',    display: 'Pearson'     },
      { slug: 'mcgrawhill', display: 'McGraw-Hill' },
      { slug: 'cengage',    display: 'Cengage'     },
    ];

    const ashbyBoards           = ['maven', 'reforge', 'sanalabs'];
    const breezyBoards          = ['teachaway', 'classpoint'];
    const bambooBoards          = ['dreambox', 'zearn', 'promethean', 'scholastic'];
    const workableBoards        = ['magoosh', 'edmentum', 'gynzy', 'knewton'];
    const smartRecruitersBoards = ['canva'];
    const recruiteeBoards       = ['toucan', 'kognity', 'studyportals'];

    // =========================================================
    // 4. SAFE WRAPPER
    //    Every fetcher returns { sourceName, jobs, failed, reason }
    //    so failures are visible to the UI instead of silently
    //    returning empty arrays.
    // =========================================================
    const safe = (sourceName, asyncFn) =>
      asyncFn()
        .then(jobs  => ({ sourceName, jobs, failed: false }))
        .catch(err  => ({ sourceName, jobs: [], failed: true, reason: err?.message || 'unknown' }));

    // =========================================================
    // 5. ATS FETCHERS
    // =========================================================

    // --- Greenhouse ---
    const greenhousePromises = greenhouseBoards.map(board =>
      safe(`Greenhouse:${board}`, async () => {
        const r = await fetch(`https://boards-api.greenhouse.io/v1/boards/${board}/jobs`, { headers });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const d = await r.json();
        return (d.jobs || []).map(j => ({
          company:  board.toUpperCase(),
          title:    j.title,
          url:      j.absolute_url,
          salary:   'Not listed',
          location: j.location?.name || 'Remote',
          source:   'Greenhouse',
          postedAt: new Date(j.updated_at).getTime()
        }));
      })
    );

    // --- Lever ---
    const leverPromises = leverBoards.map(board =>
      safe(`Lever:${board}`, async () => {
        const r = await fetch(`https://api.lever.co/v0/postings/${board}?mode=json`, { headers });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const d = await r.json();
        return Array.isArray(d) ? d.map(j => ({
          company:  board.toUpperCase(),
          title:    j.text,
          url:      j.hostedUrl,
          salary:   'Not listed',
          location: j.categories?.location || 'Remote',
          source:   'Lever',
          postedAt: j.createdAt
        })) : [];
      })
    );

    // --- Workday ---
    const workdayPromises = workdayBoards.map(board =>
      safe(`Workday:${board.slug}`, async () => {
        const r = await fetch(
          `https://www.myworkdayjobs.com/wday/cxs/${board.slug}/${board.slug}Careers/jobs`,
          {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ appliedFacets: {}, limit: 20, offset: 0, searchText: 'instructional designer' })
          }
        );
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const d = await r.json();
        return (d.jobPostings || []).map(j => ({
          company:  board.display,
          title:    j.title,
          url:      `https://www.myworkdayjobs.com/${board.slug}/${board.slug}Careers/job${j.externalPath}`,
          salary:   'Not listed',
          location: j.locationsText || 'Remote',
          source:   'Workday',
          postedAt: Date.now()
        }));
      })
    );

    // --- Ashby ---
    const ashbyPromises = ashbyBoards.map(board =>
      safe(`Ashby:${board}`, async () => {
        const r = await fetch('https://jobs.ashbyhq.com/api/non-user/recordlet/job-board/list', {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ organizationSlug: board })
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const d = await r.json();
        return (d.jobBoard?.jobPostings || []).map(j => ({
          company:  board.toUpperCase(),
          title:    j.title,
          url:      j.jobPageUrl,
          salary:   'Not listed',
          location: j.locationName || 'Remote',
          source:   'Ashby',
          postedAt: new Date(j.publishedAt).getTime()
        }));
      })
    );

    // --- Breezy ---
    const breezyPromises = breezyBoards.map(board =>
      safe(`Breezy:${board}`, async () => {
        const r = await fetch(`https://${board}.breezy.hr/json`, { headers });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const d = await r.json();
        return Array.isArray(d) ? d.map(j => ({
          company:  board.toUpperCase(),
          title:    j.name,
          url:      j.url,
          salary:   'Not listed',
          location: j.location?.name || 'Remote',
          source:   'Breezy',
          postedAt: new Date(j.published_date).getTime()
        })) : [];
      })
    );

    // --- BambooHR ---
    const bambooPromises = bambooBoards.map(board =>
      safe(`BambooHR:${board}`, async () => {
        const r = await fetch(`https://${board}.bamboohr.com/careers/list`, { headers });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const d = await r.json();
        return (d.result || []).map(j => ({
          company:  board.toUpperCase(),
          title:    j.jobTitle,
          url:      `https://${board}.bamboohr.com/careers/${j.id}`,
          salary:   'Not listed',
          location: j.location?.city ? `${j.location.city}, ${j.location.state}` : 'Remote',
          source:   'BambooHR',
          postedAt: Date.now()
        }));
      })
    );

    // --- SmartRecruiters ---
    const smartRecruitersPromises = smartRecruitersBoards.map(board =>
      safe(`SmartRecruiters:${board}`, async () => {
        const r = await fetch(`https://api.smartrecruiters.com/v1/companies/${board}/postings`, { headers });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const d = await r.json();
        return (d.content || []).map(j => ({
          company:  board.toUpperCase(),
          title:    j.name,
          url:      `https://jobs.smartrecruiters.com/${board}/${j.ref}`,
          salary:   'Not listed',
          location: j.location?.city || 'Remote',
          source:   'SmartRecruiters',
          postedAt: new Date(j.releasedDate).getTime()
        }));
      })
    );

    // --- Workable ---
    const workablePromises = workableBoards.map(board =>
      safe(`Workable:${board}`, async () => {
        const r = await fetch(`https://www.workable.com/api/accounts/${board}?details=false`, { headers });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const d = await r.json();
        return (d.jobs || []).map(j => ({
          company:  board.toUpperCase(),
          title:    j.title,
          url:      j.url,
          salary:   'Not listed',
          location: j.location?.country || 'Remote',
          source:   'Workable',
          postedAt: new Date(j.created_at).getTime()
        }));
      })
    );

    // --- Recruitee ---
    const recruiteePromises = recruiteeBoards.map(board =>
      safe(`Recruitee:${board}`, async () => {
        const r = await fetch(`https://${board}.recruitee.com/api/offers`, { headers });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const d = await r.json();
        return (d.offers || []).map(j => ({
          company:  board.toUpperCase(),
          title:    j.title,
          url:      j.careers_url,
          salary:   'Not listed',
          location: j.location || 'Remote',
          source:   'Recruitee',
          postedAt: new Date(j.published_at).getTime()
        }));
      })
    );

    // --- USAJobs ---
    const usaJobsPromise = safe('USAJobs', async () => {
      const r = await fetch(
        'https://data.usajobs.gov/api/search?PositionTitle=instructional+designer&ResultsPerPage=50&RemoteIndicator=true',
        { headers: { ...headers, 'Host': 'data.usajobs.gov', 'User-Agent': 'your-email@example.com' } }
      );
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      return (data?.SearchResult?.SearchResultItems || []).map(item => {
        const j      = item.MatchedObjectDescriptor;
        const salMin = j.PositionRemuneration?.[0]?.MinimumRange;
        const salMax = j.PositionRemuneration?.[0]?.MaximumRange;
        return {
          company:  j.OrganizationName || 'Federal Government',
          title:    j.PositionTitle,
          url:      j.PositionURI,
          salary:   salMin ? `$${Math.round(salMin / 1000)}k - $${Math.round(salMax / 1000)}k` : 'Not listed',
          location: j.PositionLocationDisplay || 'USA',
          source:   'USAJobs',
          postedAt: new Date(j.PublicationStartDate).getTime()
        };
      });
    });

    // =========================================================
    // 6. NEW: HIGHEREDJOBS — RSS feed scrape (3 relevant feeds)
    //    No public REST API exists; RSS is the official data path.
    // =========================================================
    const higherEdJobsPromise = safe('HigherEdJobs', async () => {
      const feeds = [
        'https://www.higheredjobs.com/rss/articleFeed.cfm?PosType=1&CatType=55', // Instructional Tech
        'https://www.higheredjobs.com/rss/articleFeed.cfm?PosType=1&CatType=19', // Educational Technology
        'https://www.higheredjobs.com/rss/articleFeed.cfm?PosType=1&CatType=27', // Distance / Online Ed
      ];

      const xmlResults = await Promise.allSettled(feeds.map(url => fetch(url, { headers })));
      const jobs = [];

      for (const result of xmlResults) {
        if (result.status !== 'fulfilled' || !result.value.ok) continue;
        const xml   = await result.value.text();
        const items = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];

        for (const item of items) {
          const title   = (item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1]
                        || item.match(/<title>(.*?)<\/title>/)?.[1] || '').trim();
          const link    = (item.match(/<link>(.*?)<\/link>/)?.[1] || '').trim();
          const company = (item.match(/<source[^>]*>(.*?)<\/source>/)?.[1]
                        || item.match(/<author>(.*?)<\/author>/)?.[1]
                        || 'Higher Ed Institution').replace(/<\/?[^>]+(>|$)/g, '').trim();
          const pubDate = (item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || '').trim();
          const desc    = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1] || '';
          const locHint = desc.match(/([A-Z][a-z]+(?: [A-Z][a-z]+)*,\s*[A-Z]{2})/)?.[1];

          if (!title || !link) continue;
          jobs.push({
            company,
            title:    title.replace(/<\/?[^>]+(>|$)/g, ''),
            url:      link,
            salary:   'Not listed',
            location: locHint || 'USA',
            source:   'HigherEdJobs',
            postedAt: pubDate ? new Date(pubDate).getTime() : Date.now()
          });
        }
      }
      return jobs;
    });

    // =========================================================
    // 7. NEW: CHRONICLE VITAE — RSS keyword search feeds
    // =========================================================
    const chronicleVitaePromise = safe('Chronicle Vitae', async () => {
      const feeds = [
        'https://chroniclevitae.com/job_search/jobs.rss?job_search%5Bquery%5D=instructional+designer',
        'https://chroniclevitae.com/job_search/jobs.rss?job_search%5Bquery%5D=instructional+technology',
        'https://chroniclevitae.com/job_search/jobs.rss?job_search%5Bquery%5D=elearning',
      ];

      const xmlResults = await Promise.allSettled(feeds.map(url => fetch(url, { headers })));
      const jobs = [];

      for (const result of xmlResults) {
        if (result.status !== 'fulfilled' || !result.value.ok) continue;
        const xml   = await result.value.text();
        const items = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];

        for (const item of items) {
          const title   = (item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1]
                        || item.match(/<title>(.*?)<\/title>/)?.[1] || '').trim();
          // Chronicle uses <link> but it may be preceded by a newline after </title>
          const link    = (item.match(/<link>\s*(https?:\/\/[^\s<]+)/)?.[1]
                        || item.match(/<guid[^>]*>\s*(https?:\/\/[^\s<]+)/)?.[1] || '').trim();
          const company = (item.match(/<cv:employer[^>]*>(.*?)<\/cv:employer>/)?.[1]
                        || item.match(/<dc:creator>(.*?)<\/dc:creator>/)?.[1]
                        || 'University / College').replace(/<\/?[^>]+(>|$)/g, '').trim();
          const pubDate  = (item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || '').trim();
          const location = (item.match(/<cv:location[^>]*>(.*?)<\/cv:location>/)?.[1]
                         || 'USA').replace(/<\/?[^>]+(>|$)/g, '').trim();

          if (!title || !link) continue;
          jobs.push({
            company,
            title:    title.replace(/<\/?[^>]+(>|$)/g, ''),
            url:      link,
            salary:   'Not listed',
            location,
            source:   'Chronicle Vitae',
            postedAt: pubDate ? new Date(pubDate).getTime() : Date.now()
          });
        }
      }
      return jobs;
    });

    // =========================================================
    // 8. STANDALONE AGGREGATORS
    // =========================================================
    const aggregatorPromises = [
      safe('Remotive', async () => {
        const r = await fetch('https://remotive.com/api/remote-jobs?category=teaching', { headers });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const d = await r.json();
        return (d.jobs || []).map(j => ({
          company: j.company_name, title: j.title, url: j.url,
          salary: j.salary || 'Not listed',
          location: j.candidate_required_location || 'Remote',
          source: 'Remotive', postedAt: new Date(j.publication_date).getTime()
        }));
      }),
      safe('Himalayas', async () => {
        const r = await fetch('https://himalayas.app/jobs/api?limit=100', { headers });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const d = await r.json();
        return (d.jobs || []).map(j => ({
          company: j.companyName, title: j.title, url: j.applyUrl,
          salary: j.minSalary ? `$${j.minSalary} - $${j.maxSalary}` : 'Not listed',
          location: j.locationRestrictions?.join(', ') || 'Worldwide',
          source: 'Himalayas', postedAt: j.pubDate
        }));
      }),
      safe('RemoteOK', async () => {
        const r = await fetch('https://remoteok.com/api', { headers });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const d = await r.json();
        return (Array.isArray(d) && d.length > 1) ? d.slice(1).map(j => ({
          company: j.company, title: j.position, url: j.url,
          salary: j.salary_max ? `$${Math.round(j.salary_min / 1000)}k - $${Math.round(j.salary_max / 1000)}k` : 'Not listed',
          location: j.location || 'Remote',
          source: 'RemoteOK', postedAt: new Date(j.date).getTime()
        })) : [];
      }),
      safe('WeWorkRemotely', async () => {
        const r = await fetch('https://weworkremotely.com/categories/remote-education-jobs.json', { headers });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const d = await r.json();
        return (d.jobs || []).map(j => ({
          company: j.company, title: j.subject, url: j.url,
          salary: 'Not listed', location: j.region || 'Remote',
          source: 'WeWorkRemotely', postedAt: new Date(j.created_at).getTime()
        }));
      }),
      safe('TheMuse', async () => {
        const r = await fetch('https://www.themuse.com/api/public/jobs?category=Education&location=Flexible%20%2F%20Remote&page=1', { headers });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const d = await r.json();
        return (d.results || []).map(j => ({
          company: j.company.name, title: j.name, url: j.refs.landing_page,
          salary: 'Not listed',
          location: j.locations?.map(l => l.name).join(', ') || 'Remote',
          source: 'TheMuse', postedAt: new Date(j.publication_date).getTime()
        }));
      }),
      safe('FindWork', async () => {
        const r = await fetch('https://findwork.dev/api/jobs/?search=instructional', { headers });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const d = await r.json();
        return (d.results || []).map(j => ({
          company: j.company_name, title: j.role, url: j.url,
          salary: 'Not listed', location: j.location || 'Remote',
          source: 'FindWork', postedAt: new Date(j.date_posted).getTime()
        }));
      }),
      safe('Arbeitnow', async () => {
        const r = await fetch('https://www.arbeitnow.com/api/job-board-api', { headers });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const d = await r.json();
        return (d.data || []).map(j => ({
          company: j.company_name, title: j.title, url: j.url,
          salary: 'Not listed', location: j.location || 'Remote',
          source: 'Arbeitnow', postedAt: new Date(j.created_at).getTime()
        }));
      }),
    ];

    // =========================================================
    // 9. FIRE EVERYTHING CONCURRENTLY
    // =========================================================
    const allResults = await Promise.all([
      ...greenhousePromises,
      ...leverPromises,
      ...workdayPromises,
      ...ashbyPromises,
      ...breezyPromises,
      ...bambooPromises,
      ...smartRecruitersPromises,
      ...workablePromises,
      ...recruiteePromises,
      usaJobsPromise,
      higherEdJobsPromise,
      chronicleVitaePromise,
      ...aggregatorPromises,
    ]);

    // =========================================================
    // 10. COLLECT RESULTS + SURFACE FAILURES
    // =========================================================
    const allRawJobs    = [];
    const failedSources = [];

    for (const result of allResults) {
      if (result.failed) {
        failedSources.push({ source: result.sourceName, reason: result.reason });
      } else {
        allRawJobs.push(...result.jobs);
      }
    }

    // =========================================================
    // 11. BOUNCER FILTER
    // =========================================================
    const strictlyFiltered = allRawJobs.filter(job => {
      if (job.postedAt && job.postedAt < cutoffDate) return false;
      const title = (job.title   || '').toLowerCase();
      const loc   = (job.location || '').toLowerCase();
      if (bannedLocations.some(bl => loc.includes(bl)))   return false;
      if (bannedList.some(bw => title.includes(bw)))       return false;
      return vipList.some(gw => title.includes(gw));
    });

    const uniqueJobs = Array.from(
      new Map(strictlyFiltered.map(job => [job.url, job])).values()
    );

    // =========================================================
    // 12. PAGINATION
    //     The client sends ?page=1, ?page=2, etc.
    //     All filtering happens server-side; only the requested
    //     slice is returned. Use pagination.hasNextPage in your
    //     React component to show a "Load More" button.
    // =========================================================
    const totalMatches = uniqueJobs.length;
    const totalPages   = Math.ceil(totalMatches / pageSize) || 1;
    const start        = (page - 1) * pageSize;
    const pageSlice    = uniqueJobs.slice(start, start + pageSize);

    const finalJobs = pageSlice.map(job => ({
      company: job.company,
      role:    job.title.replace(/<\/?[^>]+(>|$)/g, ''),
      url:     job.url,
      salary:  job.salary,
      notes:   `Src: ${job.source} | Posted: ${job.postedAt ? Math.round((Date.now() - job.postedAt) / 86400000) : '?'}d ago`,
      stage:   'inbox'
    }));

    // =========================================================
    // 13. RESPONSE — includes pagination meta + failed sources
    // =========================================================
    res.status(200).json({
      jobs: finalJobs,

      // Use these in your React component to drive pagination UI
      pagination: {
        page,
        pageSize,
        totalMatches,
        totalPages,
        hasNextPage: page < totalPages,
      },

      // Surface broken boards in your UI — no more flying blind
      failedSources,
    });

  } catch (error) {
    console.error('LifeOS GUI V12 API Error:', error);
    res.status(500).json({ error: 'Failed to fetch job leads.' });
  }
}
