// api/fetchJobs.js
export default async function handler(req, res) {
  try {
    const headers = { 'User-Agent': 'LifeOS-JobPipeline/1.0' };

    // 1. Fetch from FIVE different open APIs simultaneously
    const [remotiveRes, jobicyRes, arbeitnowRes, remoteOkRes, himalayasRes] = await Promise.allSettled([
      fetch('https://remotive.com/api/remote-jobs?category=teaching', { headers }),
      fetch('https://jobicy.com/api/v2/remote-jobs?jobGeo=usa', { headers }), // Targeted to US
      fetch('https://www.arbeitnow.com/api/job-board-api', { headers }),
      fetch('https://remoteok.com/api', { headers }), 
      fetch('https://himalayas.app/jobs/api?limit=100', { headers })
    ]);

    let allRawJobs = [];

    // --- 2. NORMALIZE THE DATA ---

    // Process Remotive
    if (remotiveRes.status === 'fulfilled') {
      try {
        const data = await remotiveRes.value.json();
        if (data.jobs) {
          allRawJobs.push(...data.jobs.map(j => ({ company: j.company_name, title: j.title, url: j.url, salary: j.salary || "Not listed", location: j.candidate_required_location || "", source: "Remotive" })));
        }
      } catch(e) {}
    }

    // Process Jobicy
    if (jobicyRes.status === 'fulfilled') {
      try {
        const data = await jobicyRes.value.json();
        if (data.jobs) {
          allRawJobs.push(...data.jobs.map(j => ({ company: j.companyName, title: j.jobTitle, url: j.url, salary: j.annualSalaryMax ? `$${j.annualSalaryMin} - $${j.annualSalaryMax}` : "Not listed", location: j.jobGeo || "", source: "Jobicy" })));
        }
      } catch(e) {}
    }

    // Process Arbeitnow
    if (arbeitnowRes.status === 'fulfilled') {
      try {
        const data = await arbeitnowRes.value.json();
        if (data.data) {
          allRawJobs.push(...data.data.map(j => ({ company: j.company_name, title: j.title, url: j.url, salary: "Not listed", location: j.location || "", source: "Arbeitnow" })));
        }
      } catch(e) {}
    }

    // Process RemoteOK (Array format, first item is API legal info)
    if (remoteOkRes.status === 'fulfilled') {
      try {
        const data = await remoteOkRes.value.json();
        if (Array.isArray(data) && data.length > 1) {
          allRawJobs.push(...data.slice(1).map(j => ({ company: j.company, title: j.position, url: j.url, salary: j.salary_max ? `$${Math.round(j.salary_min/1000)}k - $${Math.round(j.salary_max/1000)}k` : "Not listed", location: j.location || "", source: "RemoteOK" })));
        }
      } catch(e) {}
    }

    // Process Himalayas
    if (himalayasRes.status === 'fulfilled') {
      try {
        const data = await himalayasRes.value.json();
        if (data.jobs) {
          allRawJobs.push(...data.jobs.map(j => ({ company: j.companyName, title: j.title, url: j.applyUrl, salary: j.minSalary ? `$${j.minSalary} - $${j.maxSalary}` : "Not listed", location: j.locationRestrictions?.join(', ') || "Worldwide", source: "Himalayas" })));
        }
      } catch(e) {}
    }

    // --- 3. THE STRICT BOUNCER ---
    
    // Must contain at least one of these (Exact phrases or highly specific words)
    const vipList = ['instructional', 'curriculum', 'esl', 'edtech', 'e-learning', 'elearning', 'lxd', 'learning experience', 'educational'];
    
    // Must NOT contain any of these (The red flags)
    const bannedList = ['machine learning', 'deep learning', 'sales', 'marketing', 'engineer', 'software', 'developer', 'account executive', 'customer success', 'data scientist', 'backend', 'frontend', 'ai', 'manager of'];
    
    // Must NOT be restricted to these locations
    const bannedLocations = ['uk only', 'europe', 'emea', 'apac', 'asia', 'uk/eu'];

    const strictlyFiltered = allRawJobs.filter(job => {
      const title = job.title.toLowerCase();
      const loc = job.location.toLowerCase();

      // 1. Kick out bad locations immediately
      if (bannedLocations.some(badLoc => loc.includes(badLoc))) return false;

      // 2. Kick out red flag job titles
      if (bannedList.some(badWord => title.includes(badWord))) return false;

      // 3. Only let in the VIPs
      return vipList.some(goodWord => title.includes(goodWord));
    });

    // --- 4. CLEANUP & EXPORT ---
    
    // Remove duplicates based on URL
    const uniqueJobs = Array.from(new Map(strictlyFiltered.map(job => [job.url, job])).values());

    if (uniqueJobs.length === 0) {
      return res.status(200).json({ jobs: [] });
    }

    // Format the final leads for your React App
    const finalJobs = uniqueJobs.slice(0, 25).map(job => ({
      company: job.company,
      role: job.title.replace(/<\/?[^>]+(>|$)/g, ""), 
      url: job.url,
      salary: job.salary,
      notes: `Source: ${job.source}\nLocation: ${job.location}`,
      stage: "inbox" 
    }));

    res.status(200).json({ jobs: finalJobs });
  } catch (error) {
    console.error("Super-Aggregator API Error:", error);
    res.status(500).json({ error: "Failed to fetch job leads." });
  }
}
