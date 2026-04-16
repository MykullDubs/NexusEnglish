// api/fetchJobs.js
export default async function handler(req, res) {
  // These will be securely stored in your Vercel project settings
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;

  if (!appId || !appKey) {
    return res.status(500).json({ error: "Missing Adzuna API keys in Vercel environment." });
  }

  try {
    // We are querying US remote jobs for Instructional Design & EdTech
    const url = `https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=${appId}&app_key=${appKey}&results_per_page=10&what=instructional%20designer%20edtech&where=remote`;
    
    const response = await fetch(url);
    const data = await response.json();

    // Map Adzuna's messy data into our clean Life OS schema
    const formattedJobs = data.results.map(job => ({
      company: job.company.display_name,
      role: job.title.replace(/<\/?[^>]+(>|$)/g, ""), // Strip HTML tags
      url: job.redirect_url,
      salary: job.salary_min ? `$${Math.round(job.salary_min/1000)}k - $${Math.round(job.salary_max/1000)}k` : "",
      notes: job.description.replace(/<\/?[^>]+(>|$)/g, ""),
      stage: "inbox" // This drops it directly into the new triage column!
    }));

    res.status(200).json({ jobs: formattedJobs });
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({ error: "Failed to fetch job leads." });
  }
}
