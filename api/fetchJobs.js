// api/fetchJobs.js
export default async function handler(req, res) {
  try {
    const headers = { 'User-Agent': 'LifeOS-V7/7.0' };

    // =========================================================
    // 1. DIRECT ATS CONFIGURATIONS
    // =========================================================
    const greenhouseBoards = [
      'coursera', 'duolingo', 'masterclass', 'guildeducation', 'udemy',
      'quizlet', 'articulate', 'instructure', 'chegg', 'amplify',
      'ixllearning', 'teachable', 'thinkific', 'goguardian', 'betterup',
      'synthesis', 'degreed', 'coachhub', 'remind', 'mainstay',
      'preply', 'lingoda', 'elsa', 'busuu', 'hone', 'section', 'rivo',
      'cornerstone', 'learnupon', '360learning', 'absorblms', 'docebo',
      // NEW V7 Additions: Massive L&D and EdTech players
      'skillshare', 'brainpop', 'newsela', 'datacamp', 'ageoflearning', 'pluralsight'
    ];

    const leverBoards = [
      'outschool', 'khanacademy', 'edpuzzle', 'seesaw', 'varsitytutors',
      'paper', 'swingeducation', 'loora', 'kyronlearning', 'labster', 'springboard',
      'litmos', 'lessonly', 'highspot', 'workramp'
    ];

    const workdayBoards = [
      { slug: '2u', display: '2U' },
      { slug: 'pearson', display: 'Pearson' },
      { slug: 'mcgrawhill', display: 'McGraw-Hill' },
      { slug: 'cengage', display: 'Cengage' }
    ];

    // NEW V7: Ashby ATS (Modern AI & Cohort Startups)
    const ashbyBoards = ['maven', 'reforge', 'sanalabs'];

    // NEW V7: Breezy HR ATS
    const breezyBoards = ['teachaway', 'classpoint'];


    // =========================================================
    // 2. THE PROMISE GENERATORS (Fetch & Parse in one step)
    // =========================================================
    
    // Greenhouse Fetcher
    const greenhousePromises = greenhouseBoards.map(async board => {
      try {
        const r = await fetch(`https://boards-api.greenhouse.io/v1/boards/${board}/jobs`, { headers });
        const d = await r.json();
        return (d.jobs || []).map(j => ({ company: board.toUpperCase(), title: j.title, url: j.absolute_url, salary: "Not listed", location: j.location?.name || "Remote", source: "ATS (Greenhouse)" }));
      } catch (e) { return []; }
    });

    // Lever Fetcher
    const leverPromises = leverBoards.map(async board => {
      try {
        const r = await fetch(`https://api.lever.co/v0/postings/${board}?mode=json`, { headers });
        const d = await r.json();
        return Array.isArray(d) ? d.map(j => ({ company: board.toUpperCase(), title: j.text, url: j.hostedUrl, salary: "Not listed", location: j.categories?.location || "Remote", source: "ATS (Lever)" })) : [];
      } catch (e) { return []; }
    });

    // Workday Fetcher
    const workdayPromises = workdayBoards.map(async board => {
      try {
        const r = await fetch(`https://www.myworkdayjobs.com/wday/cxs/${board.slug}/${board.slug}Careers/jobs`, {
          method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ appliedFacets: {}, limit: 20, offset: 0, searchText: 'instructional designer' })
        });
        const d = await r.json();
        return (d.jobPostings || []).map(j => ({ company: board.display, title: j.title, url: `https://www.myworkdayjobs.com/${board.slug}/${board.slug}Careers/job${j.externalPath}`, salary: "Not listed", location: j.locationsText || "Remote", source: "ATS (Workday)" }));
      } catch (e) { return []; }
    });

    // Ashby Fetcher (NEW)
    const ashbyPromises = ashbyBoards.map(async board => {
      try {
        const r = await fetch('https://jobs.ashbyhq.com/api/non-user/recordlet/job-board/list', {
          method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ organizationSlug: board })
        });
        const d = await r.json();
        return (d.jobBoard?.jobPostings || []).map(j => ({ company: board.toUpperCase(), title: j.title, url: j.jobPageUrl, salary: "Not listed", location: j.locationName || "Remote", source: "ATS (Ashby)" }));
      } catch (e) { return []; }
    });

    // Breezy Fetcher (NEW)
    const breezyPromises = breezyBoards.map(async board => {
      try {
        const r = await fetch(`https://${board}.breezy.hr/json`, { headers });
        const d = await r.json();
        return Array.isArray(d) ? d.map(j => ({ company: board.toUpperCase(), title: j.name, url: j.url, salary: "Not listed", location: j.location?.name || "Remote", source: "ATS (Breezy)" })) : [];
      } catch (e) { return []; }
    });

    // =========================================================
    // 3. AGGREGATORS & STANDALONE BOARDS
    // =========================================================
    const standalonePromises = [
      // USA Jobs
      (async () => {
        try {
          const r = await fetch('https://data.usajobs.gov/api/search?PositionTitle=instructional+designer&ResultsPerPage=25&RemoteIndicator=true', { headers: { ...headers, 'Host': 'data.usajobs.gov', 'User-Agent': 'pipeline-bot@example.com' } });
          const d = await r.json();
          return (d?.SearchResult?.SearchResultItems || []).map(item => {
            const j = item.MatchedObjectDescriptor;
            return { company: j.OrganizationName || "Federal Gov", title: j.PositionTitle, url: j.PositionURI, salary: "Not listed", location: j.PositionLocationDisplay || "USA", source: "USAJobs" };
          });
        } catch (e) { return []; }
      })(),
      
      // Remotive
      (async () => { try { const r = await fetch('https://remotive.com/api/remote-jobs?category=teaching', { headers }); const d = await r.json(); return (d.jobs || []).map(j => ({ company: j.company_name, title: j.title, url: j.url, salary: j.salary || "Not listed", location: j.candidate_required_location || "", source: "Remotive" })); } catch (e) { return []; } })(),
      
      // Himalayas
      (async () => { try { const r = await fetch('https://himalayas.app/jobs/api?limit=100', { headers }); const d = await r.json(); return (d.jobs || []).map(j => ({ company: j.companyName, title: j.title, url: j.applyUrl, salary: "Not listed", location: j.locationRestrictions?.join(', ') || "Worldwide", source: "Himalayas" })); } catch (e) { return []; } })(),
      
      // RemoteOK
      (async () => { try { const r = await fetch('https://remoteok.com/api', { headers }); const d = await r.json(); return (Array.isArray(d) && d.length > 1) ? d.slice(1).map(j => ({ company: j.company, title: j.position, url: j.url, salary: "Not listed", location: j.location || "", source: "RemoteOK" })) : []; } catch (e) { return []; } })(),
      
      // We Work Remotely
      (async () => { try { const r = await fetch('https://weworkremotely.com/categories/remote-education-jobs.json', { headers }); const d = await r.json(); return (d.jobs || []).map(j => ({ company: j.company, title: j.subject, url: j.url, salary: "Not listed", location: j.region || "Remote", source: "WWR" })); } catch (e) { return []; } })(),

      // NEW V7: FindWork.dev Aggregator
      (async () => { try { const r = await fetch('https://findwork.dev/api/jobs/?search=instructional', { headers }); const d = await r.json(); return (d.results || []).map(j => ({ company: j.company_name, title: j.role, url: j.url, salary: "Not listed", location: j.location || "Remote", source: "FindWork" })); } catch (e) { return []; } })(),

      // NEW V7: Jobspresso WP JSON
      (async () => { try { const r = await fetch('https://jobspresso.co/wp-json/wp/v2/job_listing?search=instructional', { headers }); const d = await r.json(); return Array.isArray(d) ? d.map(j => ({ company: "Jobspresso Listing", title: j.title?.rendered, url: j.link, salary: "Not listed", location: "Remote", source: "Jobspresso" })) : []; } catch (e) { return []; } })()
    ];

    // =========================================================
    // 4. FIRE EVERYTHING CONCURRENTLY & FLATTEN
    // =========================================================
    const allPromises = [
      ...greenhousePromises, ...leverPromises, ...workdayPromises, 
      ...ashbyPromises, ...breezyPromises, ...standalonePromises
    ];

    const results = await Promise.allSettled(allPromises);
    
    // Flatten the successfully resolved arrays into one massive list
    const allRawJobs = results
      .filter(r => r.status === 'fulfilled')
      .flatMap(r => r.value);

    // =========================================================
    // 5. THE BOUNCER
    // =========================================================
    const vipList = [
      'instructional', 'curriculum', 'esl', 'edtech', 'e-learning', 'elearning',
      'lxd', 'learning experience', 'educational', 'l&d', 'learning', 'education',
      'trainer', 'training', 'subject matter expert', 'sme', 'course', 'bilingual',
      'teacher', 'educator'
    ];

    const bannedList = [
      'machine learning', 'deep learning', 'sales', 'marketing', 'engineer',
      'software', 'developer', 'account executive', 'customer success', 'data scientist',
      'backend', 'frontend', 'ai', 'manager', 'director', 'vp', 'head', 'principal',
      'counsel', 'finance'
    ];

    const bannedLocations = [
      'uk only', 'europe', 'emea', 'apac', 'asia', 'uk/eu', 'india',
      'australia', 'philippines'
    ];

    const strictlyFiltered = allRawJobs.filter(job => {
      const title = (job.title || "").toLowerCase();
      const loc = (job.location || "").toLowerCase();

      if (bannedLocations.some(badLoc => loc.includes(badLoc))) return false;
      if (bannedList.some(badWord => title.includes(badWord))) return false;
      return vipList.some(goodWord => title.includes(goodWord));
    });

    // Remove duplicates based on URL
    const uniqueJobs = Array.from(
      new Map(strictlyFiltered.map(job => [job.url, job])).values()
    );

    if (uniqueJobs.length === 0) {
      return res.status(200).json({ jobs: [] });
    }

    const finalJobs = uniqueJobs.slice(0, 50).map(job => ({
      company: job.company,
      role: job.title.replace(/<\/?[^>]+(>|$)/g, ""),
      url: job.url,
      salary: job.salary,
      notes: `Src: ${job.source} | Loc: ${job.location}`,
      stage: "inbox"
    }));

    res.status(200).json({ jobs: finalJobs });

  } catch (error) {
    console.error("LifeOS V7 API Error:", error);
    res.status(500).json({ error: "Failed to fetch job leads." });
  }
}
