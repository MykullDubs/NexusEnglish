// api/fetchJobs.js
export default async function handler(req, res) {
  try {
    const headers = { 'User-Agent': 'LifeOS-V8-Infinity/8.0' };

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

    const ashbyBoards = ['maven', 'reforge', 'sanalabs'];
    const breezyBoards = ['teachaway', 'classpoint'];

    // NEW V8: BambooHR, Workable, SmartRecruiters, Recruitee
    const bambooBoards = ['dreambox', 'zearn', 'promethean', 'scholastic'];
    const workableBoards = ['magoosh', 'edmentum', 'gynzy', 'knewton'];
    const smartRecruitersBoards = ['canva', 'smartrecruiters'];
    const recruiteeBoards = ['toucan', 'kognity', 'studyportals'];

    // =========================================================
    // 2. THE PROMISE GENERATORS (Fetch & Parse in one step)
    // =========================================================
    
    const greenhousePromises = greenhouseBoards.map(async board => {
      try {
        const r = await fetch(`https://boards-api.greenhouse.io/v1/boards/${board}/jobs`, { headers });
        const d = await r.json();
        return (d.jobs || []).map(j => ({ company: board.toUpperCase(), title: j.title, url: j.absolute_url, salary: "Not listed", location: j.location?.name || "Remote", source: "Greenhouse" }));
      } catch (e) { return []; }
    });

    const leverPromises = leverBoards.map(async board => {
      try {
        const r = await fetch(`https://api.lever.co/v0/postings/${board}?mode=json`, { headers });
        const d = await r.json();
        return Array.isArray(d) ? d.map(j => ({ company: board.toUpperCase(), title: j.text, url: j.hostedUrl, salary: "Not listed", location: j.categories?.location || "Remote", source: "Lever" })) : [];
      } catch (e) { return []; }
    });

    const workdayPromises = workdayBoards.map(async board => {
      try {
        const r = await fetch(`https://www.myworkdayjobs.com/wday/cxs/${board.slug}/${board.slug}Careers/jobs`, {
          method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ appliedFacets: {}, limit: 20, offset: 0, searchText: 'instructional designer' })
        });
        const d = await r.json();
        return (d.jobPostings || []).map(j => ({ company: board.display, title: j.title, url: `https://www.myworkdayjobs.com/${board.slug}/${board.slug}Careers/job${j.externalPath}`, salary: "Not listed", location: j.locationsText || "Remote", source: "Workday" }));
      } catch (e) { return []; }
    });

    const ashbyPromises = ashbyBoards.map(async board => {
      try {
        const r = await fetch('https://jobs.ashbyhq.com/api/non-user/recordlet/job-board/list', {
          method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ organizationSlug: board })
        });
        const d = await r.json();
        return (d.jobBoard?.jobPostings || []).map(j => ({ company: board.toUpperCase(), title: j.title, url: j.jobPageUrl, salary: "Not listed", location: j.locationName || "Remote", source: "Ashby" }));
      } catch (e) { return []; }
    });

    const breezyPromises = breezyBoards.map(async board => {
      try {
        const r = await fetch(`https://${board}.breezy.hr/json`, { headers });
        const d = await r.json();
        return Array.isArray(d) ? d.map(j => ({ company: board.toUpperCase(), title: j.name, url: j.url, salary: "Not listed", location: j.location?.name || "Remote", source: "Breezy" })) : [];
      } catch (e) { return []; }
    });

    // NEW V8: BambooHR Fetcher
    const bambooPromises = bambooBoards.map(async board => {
      try {
        const r = await fetch(`https://${board}.bamboohr.com/careers/list`, { headers });
        const d = await r.json();
        return (d.result || []).map(j => ({ company: board.toUpperCase(), title: j.jobTitle, url: `https://${board}.bamboohr.com/careers/${j.id}`, salary: "Not listed", location: j.location?.city ? `${j.location.city}, ${j.location.state}` : "Remote", source: "BambooHR" }));
      } catch (e) { return []; }
    });

    // NEW V8: SmartRecruiters Fetcher
    const smartRecruitersPromises = smartRecruitersBoards.map(async board => {
      try {
        const r = await fetch(`https://api.smartrecruiters.com/v1/companies/${board}/postings`, { headers });
        const d = await r.json();
        return (d.content || []).map(j => ({ company: board.toUpperCase(), title: j.name, url: `https://jobs.smartrecruiters.com/${board}/${j.ref}`, salary: "Not listed", location: j.location?.city || "Remote", source: "SmartRecruiters" }));
      } catch (e) { return []; }
    });

    // NEW V8: Workable Fetcher
    const workablePromises = workableBoards.map(async board => {
      try {
        const r = await fetch(`https://www.workable.com/api/accounts/${board}?details=false`, { headers });
        const d = await r.json();
        return (d.jobs || []).map(j => ({ company: board.toUpperCase(), title: j.title, url: j.url, salary: "Not listed", location: j.location?.country || "Remote", source: "Workable" }));
      } catch (e) { return []; }
    });

    // NEW V8: Recruitee Fetcher
    const recruiteePromises = recruiteeBoards.map(async board => {
      try {
        const r = await fetch(`https://${board}.recruitee.com/api/offers`, { headers });
        const d = await r.json();
        return (d.offers || []).map(j => ({ company: board.toUpperCase(), title: j.title, url: j.careers_url, salary: "Not listed", location: j.location || "Remote", source: "Recruitee" }));
      } catch (e) { return []; }
    });

    // =========================================================
    // 3. AGGREGATORS & STANDALONE BOARDS
    // =========================================================
    const standalonePromises = [
      (async () => { try { const r = await fetch('https://data.usajobs.gov/api/search?PositionTitle=instructional+designer&ResultsPerPage=25&RemoteIndicator=true', { headers: { ...headers, 'Host': 'data.usajobs.gov', 'User-Agent': 'pipeline-bot@example.com' } }); const d = await r.json(); return (d?.SearchResult?.SearchResultItems || []).map(item => { const j = item.MatchedObjectDescriptor; return { company: j.OrganizationName || "Federal Gov", title: j.PositionTitle, url: j.PositionURI, salary: "Not listed", location: j.PositionLocationDisplay || "USA", source: "USAJobs" }; }); } catch (e) { return []; } })(),
      (async () => { try { const r = await fetch('https://remotive.com/api/remote-jobs?category=teaching', { headers }); const d = await r.json(); return (d.jobs || []).map(j => ({ company: j.company_name, title: j.title, url: j.url, salary: j.salary || "Not listed", location: j.candidate_required_location || "", source: "Remotive" })); } catch (e) { return []; } })(),
      (async () => { try { const r = await fetch('https://himalayas.app/jobs/api?limit=100', { headers }); const d = await r.json(); return (d.jobs || []).map(j => ({ company: j.companyName, title: j.title, url: j.applyUrl, salary: "Not listed", location: j.locationRestrictions?.join(', ') || "Worldwide", source: "Himalayas" })); } catch (e) { return []; } })(),
      (async () => { try { const r = await fetch('https://remoteok.com/api', { headers }); const d = await r.json(); return (Array.isArray(d) && d.length > 1) ? d.slice(1).map(j => ({ company: j.company, title: j.position, url: j.url, salary: "Not listed", location: j.location || "", source: "RemoteOK" })) : []; } catch (e) { return []; } })(),
      (async () => { try { const r = await fetch('https://weworkremotely.com/categories/remote-education-jobs.json', { headers }); const d = await r.json(); return (d.jobs || []).map(j => ({ company: j.company, title: j.subject, url: j.url, salary: "Not listed", location: j.region || "Remote", source: "WWR" })); } catch (e) { return []; } })(),
      (async () => { try { const r = await fetch('https://findwork.dev/api/jobs/?search=instructional', { headers }); const d = await r.json(); return (d.results || []).map(j => ({ company: j.company_name, title: j.role, url: j.url, salary: "Not listed", location: j.location || "Remote", source: "FindWork" })); } catch (e) { return []; } })(),
      (async () => { try { const r = await fetch('https://jobspresso.co/wp-json/wp/v2/job_listing?search=instructional', { headers }); const d = await r.json(); return Array.isArray(d) ? d.map(j => ({ company: "Jobspresso Listing", title: j.title?.rendered, url: j.link, salary: "Not listed", location: "Remote", source: "Jobspresso" })) : []; } catch (e) { return []; } })(),
      
      // NEW V8: Working Nomads JSON API
      (async () => { try { const r = await fetch('https://www.workingnomads.com/api/exposed_jobs/', { headers }); const d = await r.json(); return Array.isArray(d) ? d.map(j => ({ company: j.company_name, title: j.title, url: j.url, salary: "Not listed", location: j.location_requirements || "Remote", source: "Working Nomads" })) : []; } catch (e) { return []; } })()
    ];

    // =========================================================
    // 4. FIRE EVERYTHING CONCURRENTLY & FLATTEN
    // =========================================================
    const allPromises = [
      ...greenhousePromises, ...leverPromises, ...workdayPromises, 
      ...ashbyPromises, ...breezyPromises, ...bambooPromises,
      ...smartRecruitersPromises, ...workablePromises, ...recruiteePromises,
      ...standalonePromises
    ];

    const results = await Promise.allSettled(allPromises);
    
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
    console.error("LifeOS V8 API Error:", error);
    res.status(500).json({ error: "Failed to fetch job leads." });
  }
}
