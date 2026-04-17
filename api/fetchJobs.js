// api/fetchJobs.js
export default async function handler(req, res) {
  try {
    const headers = { 'User-Agent': 'LifeOS-Messiah-V6/6.0' };

    // =========================================================
    // 1. GREENHOUSE ATS BOARDS
    // =========================================================
    const greenhouseBoards = [
      // The Giants
      'coursera', 'duolingo', 'masterclass', 'guildeducation', 'udemy',
      'quizlet', 'articulate', 'instructure', 'chegg', 'amplify',
      'ixllearning', 'teachable', 'thinkific', 'goguardian', 'betterup',
      // The Up-and-Comers (Greenhouse)
      'synthesis', 'degreed', 'coachhub', 'remind', 'mainstay',
      'preply', 'lingoda', 'elsa', 'busuu', 'hone', 'section', 'rivo',
      // NEW: Enterprise LMS & L&D Platforms
      'cornerstone', 'learnupon', '360learning', 'absorblms', 'docebo'
    ];

    // =========================================================
    // 2. LEVER ATS BOARDS
    // =========================================================
    const leverBoards = [
      // The Giants
      'outschool', 'khanacademy', 'edpuzzle', 'seesaw', 'varsitytutors',
      // The Up-and-Comers (Lever)
      'paper', 'swingeducation', 'loora', 'kyronlearning', 'labster', 'springboard',
      // NEW: L&D Platforms & Sales Enablement
      'litmos', 'lessonly', 'highspot', 'workramp'
    ];

    // =========================================================
    // 3. WORKDAY ATS BOARDS (NEW — different fetch pattern)
    // Workday uses a POST to a search endpoint. We do a keyword
    // search for "instructional designer" on each board.
    // =========================================================
    const workdayBoards = [
      { slug: '2u',          display: '2U' },
      { slug: 'pearson',     display: 'Pearson' },
      { slug: 'mcgrawhill',  display: 'McGraw-Hill' },
      { slug: 'cengage',     display: 'Cengage' },
    ];

    const workdayFetches = workdayBoards.map(board =>
      fetch(
        `https://www.myworkdayjobs.com/wday/cxs/${board.slug}/${board.slug}Careers/jobs`,
        {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appliedFacets: {},
            limit: 20,
            offset: 0,
            searchText: 'instructional designer'
          })
        }
      )
    );

    // =========================================================
    // 4. USA JOBS (Federal Government — major ID employer)
    // NEW: No auth required for basic search
    // =========================================================
    const usaJobsFetch = fetch(
      'https://data.usajobs.gov/api/search?PositionTitle=instructional+designer&ResultsPerPage=25&RemoteIndicator=true',
      {
        headers: {
          ...headers,
          'Host': 'data.usajobs.gov',
          'User-Agent': 'your-app-email@example.com', // USAJobs requires an email as User-Agent
          'Authorization-Key': '' // Optional: add a USAJobs API key here for higher rate limits
        }
      }
    );

    // =========================================================
    // 5. REMOTE AGGREGATORS (Original + New)
    // =========================================================
    const aggregatorFetches = [
      // Original aggregators
      fetch('https://remotive.com/api/remote-jobs?category=teaching', { headers }),
      fetch('https://jobicy.com/api/v2/remote-jobs?jobGeo=usa', { headers }),
      fetch('https://himalayas.app/jobs/api?limit=100', { headers }),
      fetch('https://www.themuse.com/api/public/jobs?category=Education&location=Flexible%20%2F%20Remote&page=1', { headers }),
      fetch('https://remoteok.com/api', { headers }),
      // NEW: We Work Remotely (education category)
      fetch('https://weworkremotely.com/categories/remote-education-jobs.json', { headers }),
    ];

    // =========================================================
    // 6. FIRE EVERYTHING CONCURRENTLY
    // =========================================================
    const greenhouseFetches = greenhouseBoards.map(board =>
      fetch(`https://boards-api.greenhouse.io/v1/boards/${board}/jobs`, { headers })
    );
    const leverFetches = leverBoards.map(board =>
      fetch(`https://api.lever.co/v0/postings/${board}?mode=json`, { headers })
    );

    const allResponses = await Promise.allSettled([
      ...greenhouseFetches,
      ...leverFetches,
      ...workdayFetches,
      usaJobsFetch,
      ...aggregatorFetches
    ]);

    let allRawJobs = [];

    // =========================================================
    // 7. HARVEST GREENHOUSE
    // =========================================================
    for (let i = 0; i < greenhouseBoards.length; i++) {
      if (allResponses[i].status === 'fulfilled') {
        try {
          const data = await allResponses[i].value.json();
          if (data.jobs) {
            allRawJobs.push(...data.jobs.map(j => ({
              company: greenhouseBoards[i].toUpperCase(),
              title: j.title,
              url: j.absolute_url,
              salary: "Not listed",
              location: j.location?.name || "Remote",
              source: "Direct ATS (Greenhouse)"
            })));
          }
        } catch(e) {}
      }
    }

    // =========================================================
    // 8. HARVEST LEVER
    // =========================================================
    const leverStart = greenhouseBoards.length;
    for (let i = 0; i < leverBoards.length; i++) {
      if (allResponses[leverStart + i].status === 'fulfilled') {
        try {
          const data = await allResponses[leverStart + i].value.json();
          if (Array.isArray(data)) {
            allRawJobs.push(...data.map(j => ({
              company: leverBoards[i].toUpperCase(),
              title: j.text,
              url: j.hostedUrl,
              salary: "Not listed",
              location: j.categories?.location || "Remote",
              source: "Direct ATS (Lever)"
            })));
          }
        } catch(e) {}
      }
    }

    // =========================================================
    // 9. HARVEST WORKDAY (NEW)
    // =========================================================
    const workdayStart = leverStart + leverBoards.length;
    for (let i = 0; i < workdayBoards.length; i++) {
      if (allResponses[workdayStart + i].status === 'fulfilled') {
        try {
          const data = await allResponses[workdayStart + i].value.json();
          if (data.jobPostings) {
            allRawJobs.push(...data.jobPostings.map(j => ({
              company: workdayBoards[i].display,
              title: j.title,
              url: `https://www.myworkdayjobs.com/${workdayBoards[i].slug}/${workdayBoards[i].slug}Careers/job${j.externalPath}`,
              salary: "Not listed",
              location: j.locationsText || "Remote",
              source: "Direct ATS (Workday)"
            })));
          }
        } catch(e) {}
      }
    }

    // =========================================================
    // 10. HARVEST USA JOBS (NEW)
    // =========================================================
    const usaJobsIdx = workdayStart + workdayBoards.length;
    if (allResponses[usaJobsIdx].status === 'fulfilled') {
      try {
        const data = await allResponses[usaJobsIdx].value.json();
        const items = data?.SearchResult?.SearchResultItems;
        if (items) {
          allRawJobs.push(...items.map(item => {
            const j = item.MatchedObjectDescriptor;
            const salMin = j.PositionRemuneration?.[0]?.MinimumRange;
            const salMax = j.PositionRemuneration?.[0]?.MaximumRange;
            return {
              company: j.OrganizationName || "Federal Government",
              title: j.PositionTitle,
              url: j.PositionURI,
              salary: salMin ? `$${Math.round(salMin/1000)}k - $${Math.round(salMax/1000)}k` : "Not listed",
              location: j.PositionLocationDisplay || "USA",
              source: "USAJobs (Federal)"
            };
          }));
        }
      } catch(e) {}
    }

    // =========================================================
    // 11. HARVEST AGGREGATORS
    // =========================================================
    const aggStart = usaJobsIdx + 1;

    // Remotive
    if (allResponses[aggStart].status === 'fulfilled') {
      try {
        const d = await allResponses[aggStart].value.json();
        if (d.jobs) allRawJobs.push(...d.jobs.map(j => ({
          company: j.company_name, title: j.title, url: j.url,
          salary: j.salary || "Not listed",
          location: j.candidate_required_location || "",
          source: "Remotive"
        })));
      } catch(e) {}
    }

    // Jobicy
    if (allResponses[aggStart + 1].status === 'fulfilled') {
      try {
        const d = await allResponses[aggStart + 1].value.json();
        if (d.jobs) allRawJobs.push(...d.jobs.map(j => ({
          company: j.companyName, title: j.jobTitle, url: j.url,
          salary: j.annualSalaryMax ? `$${j.annualSalaryMin} - $${j.annualSalaryMax}` : "Not listed",
          location: j.jobGeo || "",
          source: "Jobicy"
        })));
      } catch(e) {}
    }

    // Himalayas
    if (allResponses[aggStart + 2].status === 'fulfilled') {
      try {
        const d = await allResponses[aggStart + 2].value.json();
        if (d.jobs) allRawJobs.push(...d.jobs.map(j => ({
          company: j.companyName, title: j.title, url: j.applyUrl,
          salary: j.minSalary ? `$${j.minSalary} - $${j.maxSalary}` : "Not listed",
          location: j.locationRestrictions?.join(', ') || "Worldwide",
          source: "Himalayas"
        })));
      } catch(e) {}
    }

    // The Muse
    if (allResponses[aggStart + 3].status === 'fulfilled') {
      try {
        const d = await allResponses[aggStart + 3].value.json();
        if (d.results) allRawJobs.push(...d.results.map(j => ({
          company: j.company.name, title: j.name, url: j.refs.landing_page,
          salary: "Not listed",
          location: j.locations?.map(l => l.name).join(', ') || "",
          source: "The Muse"
        })));
      } catch(e) {}
    }

    // RemoteOK
    if (allResponses[aggStart + 4].status === 'fulfilled') {
      try {
        const d = await allResponses[aggStart + 4].value.json();
        if (Array.isArray(d) && d.length > 1) allRawJobs.push(...d.slice(1).map(j => ({
          company: j.company, title: j.position, url: j.url,
          salary: j.salary_max ? `$${Math.round(j.salary_min / 1000)}k - $${Math.round(j.salary_max / 1000)}k` : "Not listed",
          location: j.location || "",
          source: "RemoteOK"
        })));
      } catch(e) {}
    }

    // We Work Remotely (NEW)
    if (allResponses[aggStart + 5].status === 'fulfilled') {
      try {
        const d = await allResponses[aggStart + 5].value.json();
        // WWR returns { jobs: [...] } for their JSON endpoint
        if (d.jobs) allRawJobs.push(...d.jobs.map(j => ({
          company: j.company, title: j.subject, url: j.url,
          salary: "Not listed",
          location: j.region || "Remote",
          source: "We Work Remotely"
        })));
      } catch(e) {}
    }

    // =========================================================
    // 12. THE BOUNCER — Filter to relevant ID/L&D roles only
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
      const title = job.title.toLowerCase();
      const loc = job.location.toLowerCase();

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
    console.error("Messiah V6 API Error:", error);
    res.status(500).json({ error: "Failed to fetch job leads." });
  }
}
