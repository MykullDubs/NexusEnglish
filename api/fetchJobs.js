// api/fetchJobs.js
export default async function handler(req, res) {
  try {
    const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' };

    // 1. Fetch from SIX different sources (APIs + RSS) simultaneously
    const [remotiveRes, jobicyRes, arbeitnowRes, remoteOkRes, himalayasRes, wwrRes, themuseRes] = await Promise.allSettled([
      fetch('https://remotive.com/api/remote-jobs?category=teaching', { headers }),
      fetch('https://jobicy.com/api/v2/remote-jobs?jobGeo=usa', { headers }), 
      fetch('https://www.arbeitnow.com/api/job-board-api', { headers }),
      fetch('https://remoteok.com/api', { headers }), 
      fetch('https://himalayas.app/jobs/api?limit=100', { headers }),
      fetch('https://weworkremotely.com/categories/remote-education-jobs.rss', { headers }), // Direct WWR RSS scrape
      fetch('https://www.themuse.com/api/public/jobs?category=Education&location=Flexible%20%2F%20Remote&page=1', { headers })
    ]);

    let allRawJobs = [];

    // --- 2. NORMALIZE THE JSON APIS ---
    if (remotiveRes.status === 'fulfilled') {
      try {
        const data = await remotiveRes.value.json();
        if (data.jobs) allRawJobs.push(...data.jobs.map(j => ({ company: j.company_name, title: j.title, url: j.url, salary: j.salary || "Not listed", location: j.candidate_required_location || "", source: "Remotive" })));
      } catch(e) {}
    }

    if (jobicyRes.status === 'fulfilled') {
      try {
        const data = await jobicyRes.value.json();
        if (data.jobs) allRawJobs.push(...data.jobs.map(j => ({ company: j.companyName, title: j.jobTitle, url: j.url, salary: j.annualSalaryMax ? `$${j.annualSalaryMin} - $${j.annualSalaryMax}` : "Not listed", location: j.jobGeo || "", source: "Jobicy" })));
      } catch(e) {}
    }

    if (arbeitnowRes.status === 'fulfilled') {
      try {
        const data = await arbeitnowRes.value.json();
        if (data.data) allRawJobs.push(...data.data.map(j => ({ company: j.company_name, title: j.title, url: j.url, salary: "Not listed", location: j.location || "", source: "Arbeitnow" })));
      } catch(e) {}
    }

    if (remoteOkRes.status === 'fulfilled') {
      try {
        const data = await remoteOkRes.value.json();
        if (Array.isArray(data) && data.length > 1) allRawJobs.push(...data.slice(1).map(j => ({ company: j.company, title: j.position, url: j.url, salary: j.salary_max ? `$${Math.round(j.salary_min/1000)}k - $${Math.round(j.salary_max/1000)}k` : "Not listed", location: j.location || "", source: "RemoteOK" })));
      } catch(e) {}
    }

    if (himalayasRes.status === 'fulfilled') {
      try {
        const data = await himalayasRes.value.json();
        if (data.jobs) allRawJobs.push(...data.jobs.map(j => ({ company: j.companyName, title: j.title, url: j.applyUrl, salary: j.minSalary ? `$${j.minSalary} - $${j.maxSalary}` : "Not listed", location: j.locationRestrictions?.join(', ') || "Worldwide", source: "Himalayas" })));
      } catch(e) {}
    }

    if (themuseRes.status === 'fulfilled') {
      try {
        const data = await themuseRes.value.json();
        if (data.results) allRawJobs.push(...data.results.map(j => ({ company: j.company.name, title: j.name, url: j.refs.landing_page, salary: "Not listed", location: j.locations?.map(l=>l.name).join(', ') || "", source: "The Muse" })));
      } catch(e) {}
    }

    // --- 3. CUSTOM XML PARSER FOR WE WORK REMOTELY ---
    if (wwrRes.status === 'fulfilled') {
      try {
        const text = await wwrRes.value.text();
        // Regex to extract items from the RSS feed without needing heavy XML libraries
        const items = text.match(/<item>[\s\S]*?<\/item>/g) || [];
        items.forEach(item => {
          const titleMatch = item.match(/<title>(.*?)<\/title>/i);
          const linkMatch = item.match(/<link>(.*?)<\/link>/i);
          if (titleMatch && linkMatch) {
            let fullTitle = titleMatch[1].replace('<![CDATA[', '').replace(']]>', '');
            // WWR usually formats as "Company: Job Title"
            const parts = fullTitle.split(':');
            const company = parts.length > 1 ? parts[0].trim() : "Unknown";
            const role = parts.length > 1 ? parts.slice(1).join(':').trim() : fullTitle;
            allRawJobs.push({ company, title: role, url: linkMatch[1], salary: "Not listed", location: "Remote", source: "WeWorkRemotely" });
          }
        });
      } catch(e) { console.error("WWR Parser Error", e); }
    }

    // --- 4. THE GOD-MODE BOUNCER ---
    
    // Expanded to catch corporate L&D and specialized roles
    const vipList = [
      'instructional', 'curriculum', 'esl', 'edtech', 'e-learning', 'elearning', 
      'lxd', 'learning experience', 'educational', 'l&d', 'learning & development', 
      'trainer', 'subject matter expert', 'sme', 'instructional technologist', 'course'
    ];
    
    // Stricter banned list to keep the software noise out
    const bannedList = [
      'machine learning', 'deep learning', 'sales', 'marketing', 'engineer', 
      'software', 'developer', 'account executive', 'customer success', 'data scientist', 
      'backend', 'frontend', 'ai', 'manager of', 'director', 'vp', 'head of', 'full stack', 'principal'
    ];
    
    // Aggressive timezone/location filtering
    const bannedLocations = ['uk only', 'europe', 'emea', 'apac', 'asia', 'uk/eu', 'india', 'australia'];

    const strictlyFiltered = allRawJobs.filter(job => {
      const title = job.title.toLowerCase();
      const loc = job.location.toLowerCase();

      if (bannedLocations.some(badLoc => loc.includes(badLoc))) return false;
      if (bannedList.some(badWord => title.includes(badWord))) return false;
      return vipList.some(goodWord => title.includes(goodWord));
    });

    // --- 5. CLEANUP & EXPORT ---
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
    console.error("Super-Aggregator API Error:", error);
    res.status(500).json({ error: "Failed to fetch job leads." });
  }
}
