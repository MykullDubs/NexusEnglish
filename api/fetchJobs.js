// api/fetchJobs.js
export default async function handler(req, res) {
  try {
    const headers = { 'User-Agent': 'LifeOS-MessiahPipeline/4.0' };

    // 1. THE MASSIVE EDTECH HIT LIST (Direct Applicant Tracking Systems)
    // We expanded this to 18 of the biggest EdTech players globally.
    const greenhouseBoards = [
      'coursera', 'duolingo', 'masterclass', 'guildeducation', 'udemy', 
      'quizlet', 'articulate', 'instructure', 'chegg', 'amplify', 
      'ixllearning', 'teachable', 'thinkific', 'goguardian', 'betterup'
    ];
    
    const leverBoards = [
      'outschool', 'khanacademy', 'edpuzzle', 'seesaw', 'varsitytutors'
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

    // Fire all 23 API requests simultaneously!
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
              source: "ATS"
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
              source: "ATS"
            })));
          }
        } catch(e) {}
      }
    }

    // --- 5. HARVEST AGGREGATORS ---
    const aggStart = leverStart + leverBoards.length;
    
    // Remotive
    if (allResponses[aggStart].status === 'fulfilled') {
      try { const data = await allResponses[aggStart].value.json(); if (data.jobs) allRawJobs.push(...data.jobs.map(j => ({ company: j.company_name, title: j.title, url: j.url, salary: j.salary || "Not listed", location: j.candidate_required_location || "", source: "Remotive" }))); } catch(e) {}
    }
    // Jobicy
    if (allResponses[aggStart + 1].status === 'fulfilled') {
      try { const data = await allResponses[aggStart + 1].value.json(); if (data.jobs) allRawJobs.push(...data.jobs.map(j => ({ company: j.companyName, title: j.jobTitle, url: j.url, salary: j.annualSalaryMax ? `$${j.annualSalaryMin} - $${j.annualSalaryMax}` : "Not listed", location: j.jobGeo || "", source: "Jobicy" }))); } catch(e) {}
    }
    // Himalayas
    if (allResponses[aggStart + 2].status === 'fulfilled') {
      try { const data = await allResponses[aggStart + 2].value.json(); if (data.jobs) allRawJobs.push(...data.jobs.map(j => ({ company: j.companyName, title: j.title, url: j.applyUrl, salary: j.minSalary ? `$${j.minSalary} - $${j.maxSalary}` : "Not listed", location: j.locationRestrictions?.join(', ') || "Worldwide", source: "Himalayas" }))); } catch(e) {}
    }
    // The Muse
    if (allResponses[aggStart + 3].status === 'fulfilled') {
      try { const data = await allResponses[aggStart + 3].value.json(); if (data.results) allRawJobs.push(...data.results.map(j => ({ company: j.company.name, title: j.name, url: j.refs.landing_page, salary: "Not listed", location: j.locations?.map(l=>l.name).join(', ') || "", source: "The Muse" }))); } catch(e) {}
    }
    // RemoteOK
    if (allResponses[aggStart + 4].status === 'fulfilled') {
      try { const data = await allResponses[aggStart + 4].value.json(); if (Array.isArray(data) && data.length > 1) allRawJobs.push(...data.slice(1).map(j => ({ company: j.company, title: j.position, url: j.url, salary: j.salary_max ? `$${Math.round(j.salary_min/1000)}k - $${Math.round(j.salary_max/1000)}k` : "Not listed", location: j.location || "", source: "RemoteOK" }))); } catch(e) {}
    }

    // --- 6. THE MESSIAH BOUNCER ---
    // Massively expanded the VIP list.
    const vipList = [
      'instructional', 'curriculum', 'esl', 'edtech', 'e-learning', 'elearning', 
      'lxd', 'learning experience', 'educational', 'l&d', 'learning', 'education', 
      'trainer', 'training', 'subject matter expert', 'sme', 'course', 'bilingual', 'teacher', 'educator'
    ];
    
    // Banned words (Machine Learning is banned, so it safely filters out the software engineers)
    const bannedList = [
      'machine learning', 'deep learning', 'sales', 'marketing', 'engineer', 
      'software', 'developer', 'account executive', 'customer success', 'data scientist', 
      'backend', 'frontend', 'ai', 'manager', 'director', 'vp', 'head', 'principal', 'counsel', 'finance'
    ];
    
    const bannedLocations = ['uk only', 'europe', 'emea', 'apac', 'asia', 'uk/eu', 'india', 'australia', 'philippines'];

    const strictlyFiltered = allRawJobs.filter(job => {
      const title = job.title.toLowerCase();
      const loc = job.location.toLowerCase();

      // Rule 1: No bad timezones
      if (bannedLocations.some(badLoc => loc.includes(badLoc))) return false;
      // Rule 2: No Software/Sales/Management noise
      if (bannedList.some(badWord => title.includes(badWord))) return false;
      // Rule 3: Must be an education/training role
      return vipList.some(goodWord => title.includes(goodWord));
    });

    // --- 7. CLEANUP & EXPORT ---
    const uniqueJobs = Array.from(new Map(strictlyFiltered.map(job => [job.url, job])).values());

    if (uniqueJobs.length === 0) {
      return res.status(200).json({ jobs: [] });
    }

    // Bumped to return the top 50 matches so you have plenty to swipe on
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
    console.error("Messiah API Error:", error);
    res.status(500).json({ error: "Failed to fetch job leads." });
  }
}
