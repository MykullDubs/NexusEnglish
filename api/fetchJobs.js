// api/fetchJobs.js
export default async function handler(req, res) {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;

  if (!appId || !appKey) {
    return res.status(500).json({ error: "Missing Adzuna API keys in Vercel environment." });
  }

  try {
    // Expanded search parameters using OR logic to catch more variations of the roles
    const keywords = encodeURIComponent("instructional OR curriculum OR elearning OR ESL");
    
    // Increased results_per_page to 20 to give you a solid batch to triage
    const url = `https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=${appId}&app_key=${appKey}&results_per_page=20&what=${keywords}&where=remote`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (!data.results) {
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
