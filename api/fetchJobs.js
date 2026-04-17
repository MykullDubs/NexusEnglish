// api/fetchJobs.js
export default async function handler(req, res) {
  try {
    const headers = { 'User-Agent': 'LifeOS-Messiah-V5/5.0' };

    // 1. THE TITANIC EDTECH HIT LIST (Big Players + The Ascendant 20)
    const greenhouseBoards = [
      // The Giants
      'coursera', 'duolingo', 'masterclass', 'guildeducation', 'udemy', 
      'quizlet', 'articulate', 'instructure', 'chegg', 'amplify', 
      'ixllearning', 'teachable', 'thinkific', 'goguardian', 'betterup',
      // The Up-and-Comers (Greenhouse)
      'synthesis', 'degreed', 'coachhub', 'remind', 'mainstay', 
      'preply', 'lingoda', 'elsa', 'busuu', 'hone', 'section', 'rivo'
    ];
    
    const leverBoards = [
      // The Giants
      'outschool', 'khanacademy', 'edpuzzle', 'seesaw', 'varsitytutors',
      // The Up-and-Comers (Lever)
      'paper', 'swingeducation', 'loora', 'kyronlearning', 'labster', 'springboard'
    ];

    const greenhouseFetches = greenhouseBoards.map(board => 
      fetch(`https://boards-api.greenhouse.io/v1/boards/${board}/jobs`, { headers })
    );
    
    const leverFetches = leverBoards.map(board => 
      fetch(`https://api.lever.co/v0/postings/${board}?mode=json`, { headers })
    );

    // 2. THE TOP REMOTE AGGREGATORS
    const aggregatorFetches = [
      fetch('https://remotive.com/api/remote-jobs?category=teaching', { headers }),
      fetch('https://jobicy.com/api/v2/remote-jobs?jobGeo=usa', { headers }), 
      fetch('https://himalayas.app/jobs/api?limit=100', { headers }),
      fetch('https://www.themuse.com/api/public/jobs?category=Education&location=Flexible%20%2F%20Remote&page=1', { headers }),
      fetch('https://remoteok.com/api', { headers })
    ];

    const allResponses = await Promise.allSettled([
      ...greenhouseFetches, 
      ...leverFetches, 
      ...aggregatorFetches
    ]);

    let allRawJobs = [];

    // --- 3. HARVEST GREENHOUSE ---
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
              source: "Direct ATS"
            })));
          }
        } catch(e) {}
      }
    }

    // --- 4. HARVEST LEVER ---
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
              source: "Direct ATS"
            })));
          }
        } catch(e) {}
      }
    }

    // --- 5. HARVEST AGGREGATORS ---
    const aggStart = leverStart + leverBoards.length;
    
    if (allResponses[aggStart].status === 'fulfilled') {
      try { const d = await allResponses[aggStart].value.json(); if (d.jobs) allRawJobs.push(...d.jobs.map(j => ({ company: j.company_name, title: j.title, url: j.url, salary: j.salary || "Not listed", location: j.candidate_required_location || "", source: "Remotive" }))); } catch(e) {}
    }
    if (allResponses[aggStart + 1].status === 'fulfilled') {
      try { const d = await allResponses[aggStart + 1].value.json(); if (d.jobs) allRawJobs.push(...d.jobs.map(j => ({ company: j.companyName, title: j.jobTitle, url: j.url, salary: j.annualSalaryMax ? `$${j.annualSalaryMin} - $${j.annualSalaryMax}` : "Not listed", location: j.jobGeo || "", source: "Jobicy" }))); } catch(e) {}
    }
    if (allResponses[aggStart + 2].status === 'fulfilled') {
      try { const d = await allResponses[aggStart + 2].value.json(); if (d.jobs) allRawJobs.push(...d.jobs.map(j => ({ company: j.companyName, title: j.title, url: j.applyUrl, salary: j.minSalary ? `$${j.minSalary} - $${j.maxSalary}` : "Not listed", location: j.locationRestrictions?.join(', ') || "Worldwide", source: "Himalayas" }))); } catch(e) {}
    }
    if (allResponses[aggStart + 3].status === 'fulfilled') {
      try { const d = await allResponses[aggStart + 3].value.json(); if (d.results) allRawJobs.push(...d.results.map(j => ({ company: j.company.name, title: j.name, url: j.refs.landing_page, salary: "Not listed", location: j.locations?.map(l=>l.name).join(', ') || "", source: "The Muse" }))); } catch(e) {}
    }
    if (allResponses[aggStart + 4].status === 'fulfilled') {
      try { const d = await allResponses[aggStart + 4].value.json(); if (Array.isArray(d) && d.length > 1) allRawJobs.push(...d.slice(1).map(j => ({ company: j.company, title: j.position, url: j.url, salary: j.salary_max ? `$${Math.round(j.salary_min/1000)}k - $${Math.round(j.salary_max/1000)}k` : "Not listed", location: j.location || "", source: "RemoteOK" }))); } catch(e) {}
    }

    // --- 6. THE SUPER-BEEFED BOUNCER ---
    const vipList = [
      'instructional', 'curriculum', 'esl', 'edtech', 'e-learning', 'elearning', 
      'lxd', 'learning experience', 'educational', 'l&d', 'learning', 'education', 
      'trainer', 'training', 'subject matter expert', 'sme', 'course', 'bilingual', 'teacher', 'educator'
    ];
    
    const bannedList = [
      'machine learning', 'deep learning', 'sales', 'marketing', 'engineer', 
      'software', 'developer', 'account executive', 'customer success', 'data scientist', 
      'backend', 'frontend', 'ai', 'manager', 'director', 'vp', 'head', 'principal', 'counsel', 'finance'
    ];
    
    const bannedLocations = ['uk only', 'europe', 'emea', 'apac', 'asia', 'uk/eu', 'india', 'australia', 'philippines'];

    const strictlyFiltered = allRawJobs.filter(job => {
      const title = job.title.toLowerCase();
      const loc = job.location.toLowerCase();

      if (bannedLocations.some(badLoc => loc.includes(badLoc))) return false;
      if (bannedList.some(badWord => title.includes(badWord))) return false;
      return vipList.some(goodWord => title.includes(goodWord));
    });

    const uniqueJobs = Array.from(new Map(strictlyFiltered.map(job => [job.url, job])).values());

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
    console.error("Messiah V5 API Error:", error);
    res.status(500).json({ error: "Failed to fetch job leads." });
  }
}
