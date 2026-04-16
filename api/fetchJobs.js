// api/fetchJobs.js
export default async function handler(req, res) {
  try {
    // 1. We bypass Adzuna entirely. Remotive requires NO API keys!
    // 2. We search their open database for remote education/startup roles.
    const url = `https://remotive.com/api/remote-jobs?search=education`;
    
    const response = await fetch(url);
    const data = await response.json();

    // Remotive returns data inside a "jobs" array
    if (!data.jobs || data.jobs.length === 0) {
      return res.status(200).json({ jobs: [] });
    }

    // Grab the top 15 most recent remote roles and map them to your Life OS
    const formattedJobs = data.jobs.slice(0, 15).map(job => ({
      company: job.company_name,
      role: job.title.replace(/<\/?[^>]+(>|$)/g, ""), // Strip out HTML tags
      url: job.url,
      salary: job.salary || "Not listed",
      notes: `Location: ${job.candidate_required_location}\nCategory: ${job.category}`, 
      stage: "inbox" 
    }));

    res.status(200).json({ jobs: formattedJobs });
  } catch (error) {
    console.error("Remotive API Error:", error);
    res.status(500).json({ error: "Failed to fetch job leads." });
  }
}
