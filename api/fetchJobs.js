// api/fetchJobs.js
export default async function handler(req, res) {
  try {
    // 1. We spoof a User-Agent so the APIs don't think we are a malicious bot
    const headers = { 'User-Agent': 'LifeOS-JobPipeline/1.0' };

    // 2. Fetch from THREE different open remote job APIs simultaneously
    const [remotiveRes, jobicyRes, arbeitnowRes] = await Promise.allSettled([
      // Remotive's dedicated education/teaching category
      fetch('https://remotive.com/api/remote-jobs?category=teaching', { headers }),
      // Jobicy's open remote feed
      fetch('https://jobicy.com/api/v2/remote-jobs', { headers }),
      // Arbeitnow's open job board API
      fetch('https://www.arbeitnow.com/api/job-board-api', { headers })
    ]);

    let allRawJobs = [];

    // --- 3. NORMALIZE THE DATA ---
    // Every API names their variables differently. We need to standardize them.

    // Process Remotive
    if (remotiveRes.status === 'fulfilled') {
      const data = await remotiveRes.value.json();
      if (data.jobs) {
        const normalized = data.jobs.map(j => ({
          company: j.company_name,
          title: j.title,
          url: j.url,
          salary: j.salary || "Not listed",
          notes: `Source: Remotive\nLocation: ${j.candidate_required_location}`
        }));
        allRawJobs.push(...normalized);
      }
    }

    // Process Jobicy
    if (jobicyRes.status === 'fulfilled') {
      const data = await jobicyRes.value.json();
      if (data.jobs) {
        const normalized = data.jobs.map(j => ({
          company: j.companyName,
          title: j.jobTitle,
          url: j.url,
          salary: j.annualSalaryMax ? `$${j.annualSalaryMin} - $${j.annualSalaryMax}` : "Not listed",
          notes: `Source: Jobicy\nLocation: ${j.jobGeo}`
        }));
        allRawJobs.push(...normalized);
      }
    }

    // Process Arbeitnow
    if (arbeitnowRes.status === 'fulfilled') {
      const data = await arbeitnowRes.value.json();
      if (data.data) {
        const normalized = data.data.map(j => ({
          company: j.company_name,
          title: j.title,
          url: j.url,
          salary: "Not listed",
          notes: `Source: Arbeitnow\nLocation: ${j.location}`
        }));
        allRawJobs.push(...normalized);
      }
    }

    // --- 4. THE STRICT BOUNCER ---
    // Only allow jobs that specifically match your career trajectory
    const targetKeywords = ['instructional', 'curriculum', 'esl', 'teacher', 'educator', 'learning', 'edtech', 'training', 'tutor', 'course', 'content'];

    const strictlyFiltered = allRawJobs.filter(job => {
      const title = job.title.toLowerCase();
      // Keep the job if the title contains ANY of our keywords
      return targetKeywords.some(kw => title.includes(kw));
    });

    // 5. Remove any duplicates (if a startup posted on multiple boards)
    const uniqueJobs = Array.from(new Map(strictlyFiltered.map(job => [job.url, job])).values());

    if (uniqueJobs.length === 0) {
      return res.status(200).json({ jobs: [] });
    }

    // 6. Format the clean leads for your React App
    const finalJobs = uniqueJobs.slice(0, 25).map(job => ({
      company: job.company,
      role: job.title.replace(/<\/?[^>]+(>|$)/g, ""), // Strip rogue HTML tags
      url: job.url,
      salary: job.salary,
      notes: job.notes,
      stage: "inbox" 
    }));

    res.status(200).json({ jobs: finalJobs });
  } catch (error) {
    console.error("Super-Aggregator API Error:", error);
    res.status(500).json({ error: "Failed to fetch job leads." });
  }
}
