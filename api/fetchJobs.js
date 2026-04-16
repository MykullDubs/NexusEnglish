// api/fetchJobs.js
export default async function handler(req, res) {
  try {
    // 1. Fetch a broad net of jobs using two different keywords
    const [res1, res2] = await Promise.all([
      fetch('https://remotive.com/api/remote-jobs?search=learning'),
      fetch('https://remotive.com/api/remote-jobs?search=education')
    ]);
    
    const data1 = await res1.json();
    const data2 = await res2.json();

    // 2. Combine the results and remove any duplicates
    const allJobs = [...(data1.jobs || []), ...(data2.jobs || [])];
    const uniqueJobs = Array.from(new Map(allJobs.map(job => [job.id, job])).values());

    // 3. THE BOUNCER: Strictly check the actual Job Title for your target roles
    const targetKeywords = ['instructional', 'curriculum', 'esl', 'teacher', 'educator', 'learning', 'edtech', 'training', 'tutor', 'course', 'content'];
    
    const strictlyFiltered = uniqueJobs.filter(job => {
      const title = job.title.toLowerCase();
      // Only keep the job if the title contains at least one of our keywords
      return targetKeywords.some(kw => title.includes(kw));
    });

    if (strictlyFiltered.length === 0) {
      return res.status(200).json({ jobs: [] });
    }

    // 4. Format the clean leads for your Life OS
    const formattedJobs = strictlyFiltered.slice(0, 15).map(job => ({
      company: job.company_name,
      role: job.title.replace(/<\/?[^>]+(>|$)/g, ""), // Strip out HTML tags
      url: job.url,
      salary: job.salary || "Not listed",
      notes: `Location: ${job.candidate_required_location}\nCategory: ${job.category}`, 
      stage: "inbox" 
    }));

    res.status(200).json({ jobs: formattedJobs });
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({ error: "Failed to fetch job leads." });
  }
}
