// api/fetchJobs.js
export default async function handler(req, res) {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;

  if (!appId || !appKey) {
    return res.status(500).json({ error: "Missing Adzuna API keys in Vercel environment." });
  }

  try {
    // 1. Remove "where=remote" so we don't search for the town in Oregon
    // 2. Put "remote" directly into the keywords
    // 3. Use Adzuna's OR syntax to cast a massive net
    const keywords = encodeURIComponent("remote instructional OR remote curriculum OR remote elearning OR remote ESL");
    
    // Increased to 30 results per page to give you a solid inbox batch
    const url = `https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=${appId}&app_key=${appKey}&results_per_page=30&what=${keywords}`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      return res.status(200).json({ jobs: [] });
    }

    const formattedJobs = data.results.map(job => ({
      company: job.company.display_name,
      role: job.title.replace(/<\/?[^>]+(>|$)/g, ""), 
      url: job.redirect_url,
      salary: job.salary_min ? `$${Math.round(job.salary_min/1000)}k - $${Math.round(job.salary_max/1000)}k` : "",
      notes: job.description.replace(/<\/?[^>]+(>|$)/g, ""),
      stage: "inbox" 
    }));

    res.status(200).json({ jobs: formattedJobs });
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({ error: "Failed to fetch job leads." });
  }
}
