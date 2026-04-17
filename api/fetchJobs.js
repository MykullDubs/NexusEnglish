// api/fetchJobs.js
export default async function handler(req, res) {
  try {
    const headers = { 
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, application/xml, text/plain, */*'
    };

    const body       = req.body || {};
    const daysLimit  = parseInt(body.days)  || parseInt(req.query.days)  || 14;
    const page       = Math.max(1, parseInt(body.page) || parseInt(req.query.page) || 1);
    const pageSize   = 50;
    const cutoffDate = new Date(Date.now() - daysLimit * 24 * 60 * 60 * 1000).getTime();

    // =========================================================
    // 1. DYNAMIC BOUNCER
    // =========================================================
    const rawVip       = body.vip       || 'instructional, curriculum, esl, edtech, e-learning, elearning, lxd, learning experience, educational, l&d, learning, education, trainer, training, subject matter expert, sme, course, bilingual, teacher, educator, lms, technologist, localization, linguist, frontend, front-end, react, web developer, learning engineer, javascript';
    const rawBanned    = body.banned    || 'machine learning, deep learning, sales, marketing, data scientist, backend, data engineer, account executive, customer success, manager, director, vp, head, principal, counsel, finance, payroll';
    const rawLocations = body.locations || 'uk only, europe, emea, apac, asia, uk/eu, india, australia, philippines';

    const vipList         = rawVip.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    const bannedList      = rawBanned.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    const bannedLocations = rawLocations.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

    // =========================================================
    // 2. SAFE WRAPPER
    // =========================================================
    const safe = (sourceName, asyncFn) =>
      asyncFn()
        .then(jobs  => ({ sourceName, jobs, failed: false }))
        .catch(err  => ({ sourceName, jobs: [], failed: true, reason: err?.message || 'unknown' }));

    // =========================================================
    // 3. ATS FETCHERS
    // =========================================================
    const greenhouseBoards = ['coursera', 'duolingo', 'masterclass', 'udemy', 'ixllearning', 'thinkific', 'hone', 'datacamp'];
    const leverBoards = ['edpuzzle'];
    const workableBoards = ['edmentum'];
    const smartRecruitersBoards = ['canva'];

    const greenhousePromises = greenhouseBoards.map(board =>
      safe(`Greenhouse:${board}`, async () => {
        const r = await fetch(`https://boards-api.greenhouse.io/v1/boards/${board}/jobs`, { headers });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const d = await r.json();
        return (d.jobs || []).map(j => ({ company: board.toUpperCase(), title: j.title, url: j.absolute_url, salary: 'Not listed', location: j.location?.name || 'Remote', source: 'Greenhouse', postedAt: new Date(j.updated_at).getTime() }));
      })
    );

    const leverPromises = leverBoards.map(board =>
      safe(`Lever:${board}`, async () => {
        const r = await fetch(`https://api.lever.co/v0/postings/${board}?mode=json`, { headers });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const d = await r.json();
        return Array.isArray(d) ? d.map(j => ({ company: board.toUpperCase(), title: j.text, url: j.hostedUrl, salary: 'Not listed', location: j.categories?.location || 'Remote', source: 'Lever', postedAt: j.createdAt })) : [];
      })
    );

    const smartRecruitersPromises = smartRecruitersBoards.map(board =>
      safe(`SmartRecruiters:${board}`, async () => {
        const r = await fetch(`https://api.smartrecruiters.com/v1/companies/${board}/postings`, { headers });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const d = await r.json();
        return (d.content || []).map(j => ({ company: board.toUpperCase(), title: j.name, url: `https://jobs.smartrecruiters.com/${board}/${j.ref}`, salary: 'Not listed', location: j.location?.city || 'Remote', source: 'SmartRecruiters', postedAt: new Date(j.releasedDate).getTime() }));
      })
    );

    const workablePromises = workableBoards.map(board =>
      safe(`Workable:${board}`, async () => {
        const r = await fetch(`https://www.workable.com/api/accounts/${board}?details=false`, { headers });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const d = await r.json();
        return (d.jobs || []).map(j => ({ company: board.toUpperCase(), title: j.title, url: j.url, salary: 'Not listed', location: j.location?.country || 'Remote', source: 'Workable', postedAt: new Date(j.created_at).getTime() }));
      })
    );

    // =========================================================
    // 4. RSS SUPER-AGGREGATOR (The Bulletproof Feeds)
    // =========================================================
    const rssFeeds = [
      { name: 'Remote.co', url: 'https://remote.co/remote-jobs/feed/' },
      { name: 'DailyRemote', url: 'https://dailyremote.com/remote-jobs.rss' },
      { name: 'NoDesk', url: 'https://nodesk.co/remote-jobs/rss.xml' },
      { name: 'Jobspresso', url: 'https://jobspresso.co/feed/' },
      { name: 'AuthenticJobs', url: 'https://authenticjobs.com/rss' },
      { name: 'HigherEdJobs(Tech)', url: 'https://www.higheredjobs.com/rss/articleFeed.cfm?PosType=1&CatType=55' },
      { name: 'HigherEdJobs(EdTech)', url: 'https://www.higheredjobs.com/rss/articleFeed.cfm?PosType=1&CatType=19' },
      { name: 'HigherEdJobs(Online)', url: 'https://www.higheredjobs.com/rss/articleFeed.cfm?PosType=1&CatType=27' },
      { name: 'Chronicle(ID)', url: 'https://chroniclevitae.com/job_search/jobs.rss?job_search%5Bquery%5D=instructional+designer' },
      { name: 'Chronicle(eLearning)', url: 'https://chroniclevitae.com/job_search/jobs.rss?job_search%5Bquery%5D=elearning' },
      { name: 'WeWorkRemotely', url: 'https://weworkremotely.com/remote-jobs.rss' }
    ];

    const universalRssPromise = safe('RSS Super-Aggregator', async () => {
      const xmlResults = await Promise.allSettled(rssFeeds.map(feed => fetch(feed.url, { headers }).then(r => r.text().then(xml => ({ feedName: feed.name, xml })))));
      const jobs = [];

      for (const result of xmlResults) {
        if (result.status !== 'fulfilled') continue;
        const { feedName, xml } = result.value;
        const items = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];

        for (const item of items) {
          const rawTitle = (item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] || item.match(/<title>(.*?)<\/title>/)?.[1] || '').trim();
          const link     = (item.match(/<link>\s*(https?:\/\/[^\s<]+)/)?.[1] || item.match(/<guid[^>]*>\s*(https?:\/\/[^\s<]+)/)?.[1] || '').trim();
          const pubDate  = (item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || '').trim();
          
          if (!rawTitle || !link) continue;

          // Clean up titles and extract company names. 
          // Many RSS feeds format titles as "Company Name: Job Title" or "Job Title at Company Name"
          let title = rawTitle.replace(/<\/?[^>]+(>|$)/g, '').trim();
          let company = feedName; // Fallback to the board name
          
          if (title.includes(' at ')) {
            const parts = title.split(' at ');
            title = parts[0].trim();
            company = parts[1].trim();
          } else if (title.includes(':')) {
            const parts = title.split(':');
            company = parts[0].trim();
            title = parts.slice(1).join(':').trim();
          }

          jobs.push({ 
            company, 
            title, 
            url: link, 
            salary: 'Not listed', 
            location: 'Remote', 
            source: feedName, 
            postedAt: pubDate ? new Date(pubDate).getTime() : Date.now() 
          });
        }
      }
      return jobs;
    });

    // =========================================================
    // 5. JSON AGGREGATORS
    // =========================================================
    const aggregatorPromises = [
      safe('Remotive', async () => { const r = await fetch('https://remotive.com/api/remote-jobs?category=teaching', { headers }); if (!r.ok) throw new Error(`HTTP ${r.status}`); const d = await r.json(); return (d.jobs || []).map(j => ({ company: j.company_name, title: j.title, url: j.url, salary: j.salary || 'Not listed', location: j.candidate_required_location || 'Remote', source: 'Remotive', postedAt: new Date(j.publication_date).getTime() })); }),
      safe('RemoteOK', async () => { const r = await fetch('https://remoteok.com/api', { headers }); if (!r.ok) throw new Error(`HTTP ${r.status}`); const d = await r.json(); return (Array.isArray(d) && d.length > 1) ? d.slice(1).map(j => ({ company: j.company, title: j.position, url: j.url, salary: j.salary_max ? `$${Math.round(j.salary_min / 1000)}k - $${Math.round(j.salary_max / 1000)}k` : 'Not listed', location: j.location || 'Remote', source: 'RemoteOK', postedAt: new Date(j.date).getTime() })) : []; }),
      safe('TheMuse', async () => { const r = await fetch('https://www.themuse.com/api/public/jobs?category=Education&location=Flexible%20%2F%20Remote&page=1', { headers }); if (!r.ok) throw new Error(`HTTP ${r.status}`); const d = await r.json(); return (d.results || []).map(j => ({ company: j.company.name, title: j.name, url: j.refs.landing_page, salary: 'Not listed', location: j.locations?.map(l => l.name).join(', ') || 'Remote', source: 'TheMuse', postedAt: new Date(j.publication_date).getTime() })); }),
      safe('Arbeitnow', async () => { const r = await fetch('https://www.arbeitnow.com/api/job-board-api', { headers }); if (!r.ok) throw new Error(`HTTP ${r.status}`); const d = await r.json(); return (d.data || []).map(j => ({ company: j.company_name, title: j.title, url: j.url, salary: 'Not listed', location: j.location || 'Remote', source: 'Arbeitnow', postedAt: new Date(j.created_at).getTime() })); }),
    ];

    // =========================================================
    // 6. FIRE EVERYTHING CONCURRENTLY
    // =========================================================
    const allResults = await Promise.all([
      ...greenhousePromises,
      ...leverPromises,
      ...smartRecruitersPromises,
      ...workablePromises,
      universalRssPromise,
      ...aggregatorPromises,
    ]);

    // =========================================================
    // 7. COLLECT RESULTS + FAILURES
    // =========================================================
    const allRawJobs    = [];
    const failedSources = [];

    for (const result of allResults) {
      if (result.failed) failedSources.push({ source: result.sourceName, reason: result.reason });
      else allRawJobs.push(...result.jobs);
    }

    // =========================================================
    // 8. BOUNCER FILTER
    // =========================================================
    const strictlyFiltered = allRawJobs.filter(job => {
      if (job.postedAt && job.postedAt < cutoffDate) return false;
      const title = (job.title   || '').toLowerCase();
      const loc   = (job.location || '').toLowerCase();
      if (bannedLocations.some(bl => loc.includes(bl))) return false;
      if (bannedList.some(bw => title.includes(bw))) return false;
      return vipList.some(gw => title.includes(gw));
    });

    const uniqueJobs = Array.from(new Map(strictlyFiltered.map(job => [job.url, job])).values());

    // =========================================================
    // 9. PAGINATION
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
    // 10. RESPONSE
    // =========================================================
    res.status(200).json({
      jobs: finalJobs,
      pagination: { page, pageSize, totalMatches, totalPages, hasNextPage: page < totalPages },
      failedSources,
    });

  } catch (error) {
    console.error('LifeOS GUI V14 API Error:', error);
    res.status(500).json({ error: 'Failed to fetch job leads.' });
  }
}
