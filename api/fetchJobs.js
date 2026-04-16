// api/fetchJobs.js
export default async function handler(req, res) {
  try {
    const headers = { 'User-Agent': 'LifeOS-JobPipeline/2.0' };

    // 1. THE DIRECT ATS HIT LIST (No paywalls, direct employer links)
    const greenhouseCompanies = ['coursera', 'duolingo', 'masterclass', 'guildeducation', 'udemy', 'quizlet', 'articulate'];
    const leverCompanies = ['outschool', 'khanacademy', 'edpuzzle'];

    const greenhouseFetches = greenhouseCompanies.map(company => 
      fetch(`https://boards-api.greenhouse.io/v1/boards/${company}/jobs`, { headers })
    );
    
    const leverFetches = leverCompanies.map(company => 
      fetch(`https://api.lever.co/v0/postings/${company}?mode=json`, { headers })
    );

    // 2. THE BEST AGGREGATORS (Keeping the non-paywalled heavy hitters)
    const aggregatorFetches = [
      fetch('https://remotive.com/api/remote-jobs?category=teaching', { headers }),
      fetch('https://himalayas.app/jobs/api?limit=100', { headers }),
      fetch('https://www.themuse.com/api/public/jobs?category=Education&location=Flexible%20%2F%20Remote&page=1', { headers })
    ];

    // Fire them all simultaneously
    const allResponses = await Promise.allSettled([
      ...greenhouseFetches, 
      ...leverFetches, 
      ...aggregatorFetches
    ]);

    let allRawJobs = [];

    // --- 3. NORMALIZE GREENHOUSE ATS DATA ---
    for (let i = 0; i < greenhouseCompanies.length; i++) {
      const res = allResponses[i];
      if (res.status === 'fulfilled') {
        try {
          const data = await res.value.json();
          if (data.jobs) {
            allRawJobs.push(...data.jobs.map(j => ({
              company: greenhouseCompanies[i].toUpperCase(),
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

    // --- 4. NORMALIZE LEVER ATS DATA ---
    const leverStartIndex = greenhouseCompanies.length;
    for (let i = 0; i < leverCompanies.length; i++) {
      const res = allResponses[leverStartIndex + i];
      if (res.status === 'fulfilled') {
        try {
          const data = await res.value.json();
          if (Array.isArray(data)) {
            allRawJobs.push(...data.map(j => ({
              company: leverCompanies[i].toUpperCase(),
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

    // --- 5. NORMALIZE AGGREGATOR DATA ---
    const aggStartIndex = greenhouseCompanies.length + leverCompanies.length;
    
    // Remotive
    if (allResponses[aggStartIndex].status === 'fulfilled') {
      try {
        const data = await allResponses[aggStartIndex].value.json();
        if (data.jobs) allRawJobs.push(...data.jobs.map(j => ({ company: j.company_name, title: j.title, url: j.url, salary: j.salary || "Not listed", location: j.candidate_required_location || "", source: "Remotive" })));
      } catch(e) {}
    }

    // Himalayas
    if (allResponses[aggStartIndex + 1].status === 'fulfilled') {
      try {
        const data = await allResponses[aggStartIndex + 1].value.json();
        if (data.jobs) allRawJobs.push(...data.jobs.map(j => ({ company: j.companyName, title: j.title, url: j.applyUrl, salary: j.minSalary ? `$${j.minSalary} - $${j.maxSalary}` : "Not listed", location: j.locationRestrictions?.join(', ') || "Worldwide", source: "Himalayas" })));
      } catch(e) {}
    }

    // The Muse
    if (allResponses[aggStartIndex + 2].status === 'fulfilled') {
      try {
        const data = await allResponses[aggStartIndex + 2].value.json();
        if (data.results) allRawJobs.push(...data.results.map(j => ({ company: j.company.name, title: j.name, url: j.refs.landing_page, salary: "Not listed", location: j.locations?.map(l=>l.name).join(', ') || "", source: "The Muse" })));
      } catch(e) {}
    }

    // --- 6. THE TITAN BOUNCER ---
    
    const vipList = [
      'instructional', 'curriculum', 'esl', 'edtech', 'e-learning', 'elearning', 
      'lxd', 'learning experience', 'educational', 'l&d', 'learning & development', 
      'trainer', 'subject matter expert', 'sme', 'instructional technologist', 'course'
    ];
    
    const bannedList = [
      'machine learning', 'deep learning', 'sales', 'marketing', 'engineer', 
      'software', 'developer', 'account executive', 'customer success', 'data scientist', 
      'backend', 'frontend', 'ai', 'manager of', 'director', 'vp', 'head of', 'full stack', 'principal'
    ];
    
    const bannedLocations = ['uk only', 'europe', 'emea', 'apac', 'asia', 'uk/eu', 'india', 'australia'];

    const strictlyFiltered = allRawJobs.filter(job => {
      const title = job.title.toLowerCase();
      const loc = job.location.toLowerCase();

      // Ensure jobs align with Pacific Time / Americas overlap
      if (bannedLocations.some(badLoc => loc.includes(badLoc))) return false;
      if (bannedList.some(badWord => title.includes(badWord))) return false;
      
      // If it's from a direct ATS, we want to be absolutely sure it's remote
      if (job.source === "Direct ATS" && !loc.includes('remote') && !title.includes('remote')) return false;

      return vipList.some(goodWord => title.includes(goodWord));
    });

    // --- 7. CLEANUP & EXPORT ---
    const uniqueJobs = Array.from(new Map(strictlyFiltered.map(job => [job.url, job])).values());

    if (uniqueJobs.length === 0) {
      return res.status(200).json({ jobs: [] });
    }

    const finalJobs = uniqueJobs.slice(0, 35).map(job => ({
      company: job.company,
      role: job.title.replace(/<\/?[^>]+(>|$)/g, ""), 
      url: job.url,
      salary: job.salary,
      notes: `Source: ${job.source}\nLocation/Reqs: ${job.location}`,
      stage: "inbox" 
    }));

    res.status(200).json({ jobs: finalJobs });
  } catch (error) {
    console.error("Titan-Aggregator API Error:", error);
    res.status(500).json({ error: "Failed to fetch job leads." });
  }
}
