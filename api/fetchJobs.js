// api/fetchJobs.js
export default async function handler(req, res) {
  try {
    const headers = { 'User-Agent': 'LifeOS-GUI-V11/11.0' };
    
    // We now accept POST bodies from your React app
    const body = req.body ? JSON.parse(req.body) : {};
    const daysLimit = parseInt(body.days) || parseInt(req.query.days) || 14;
    const cutoffDate = new Date(Date.now() - daysLimit * 24 * 60 * 60 * 1000).getTime();

    // =========================================================
    // 1. DIRECT ATS CONFIGURATIONS
    // =========================================================
    const greenhouseBoards = [
      'coursera', 'duolingo', 'masterclass', 'guildeducation', 'udemy',
      'quizlet', 'articulate', 'instructure', 'chegg', 'amplify',
      'ixllearning', 'teachable', 'thinkific', 'goguardian', 'betterup',
      'synthesis', 'degreed', 'coachhub', 'remind', 'mainstay',
      'preply', 'lingoda', 'elsa', 'busuu', 'hone', 'section', 'rivo',
      'cornerstone', 'learnupon', '360learning', 'absorblms', 'docebo',
      'skillshare', 'brainpop', 'newsela', 'datacamp', 'ageoflearning', 'pluralsight',
      'babbel', 'memrise', 'outlier', 'roblox', 'epicgames', 'classdojo', 'nearpod'
    ];

    const leverBoards = [
      'outschool', 'khanacademy', 'edpuzzle', 'seesaw', 'varsitytutors',
      'paper', 'swingeducation', 'loora', 'kyronlearning', 'labster', 'springboard',
      'litmos', 'lessonly', 'highspot', 'workramp', 'cambly', 'kahoot', 'speak', 'slang'
    ];

    const workdayBoards = [
      { slug: '2u', display: '2U' }, { slug: 'pearson', display: 'Pearson' },
      { slug: 'mcgrawhill', display: 'McGraw-Hill' }, { slug: 'cengage', display: 'Cengage' }
    ];

    const ashbyBoards = ['maven', 'reforge', 'sanalabs'];
    const breezyBoards = ['teachaway', 'classpoint'];
    const bambooBoards = ['dreambox', 'zearn', 'promethean', 'scholastic'];
    const workableBoards = ['magoosh', 'edmentum', 'gynzy', 'knewton'];
    const smartRecruitersBoards = ['canva', 'smartrecruiters'];
    const recruiteeBoards = ['toucan', 'kognity', 'studyportals'];

    // =========================================================
    // 2. THE PROMISE GENERATORS
    // =========================================================
    const greenhousePromises = greenhouseBoards.map(async board => { try { const r = await fetch(`https://boards-api.greenhouse.io/v1/boards/${board}/jobs`, { headers }); const d = await r.json(); return (d.jobs || []).map(j => ({ company: board.toUpperCase(), title: j.title, url: j.absolute_url, salary: "Not listed", location: j.location?.name || "Remote", source: "Greenhouse", postedAt: new Date(j.updated_at).getTime() })); } catch (e) { return []; } });
    const leverPromises = leverBoards.map(async board => { try { const r = await fetch(`https://api.lever.co/v0/postings/${board}?mode=json`, { headers }); const d = await r.json(); return Array.isArray(d) ? d.map(j => ({ company: board.toUpperCase(), title: j.text, url: j.hostedUrl, salary: "Not listed", location: j.categories?.location || "Remote", source: "Lever", postedAt: j.createdAt })) : []; } catch (e) { return []; } });
    const workdayPromises = workdayBoards.map(async board => { try { const r = await fetch(`https://www.myworkdayjobs.com/wday/cxs/${board.slug}/${board.slug}Careers/jobs`, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ appliedFacets: {}, limit: 20, offset: 0, searchText: 'instructional designer' }) }); const d = await r.json(); return (d.jobPostings || []).map(j => ({ company: board.display, title: j.title, url: `https://www.myworkdayjobs.com/${board.slug}/${board.slug}Careers/job${j.externalPath}`, salary: "Not listed", location: j.locationsText || "Remote", source: "Workday", postedAt: Date.now() })); } catch (e) { return []; } });
    const ashbyPromises = ashbyBoards.map(async board => { try { const r = await fetch('https://jobs.ashbyhq.com/api/non-user/recordlet/job-board/list', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ organizationSlug: board }) }); const d = await r.json(); return (d.jobBoard?.jobPostings || []).map(j => ({ company: board.toUpperCase(), title: j.title, url: j.jobPageUrl, salary: "Not listed", location: j.locationName || "Remote", source: "Ashby", postedAt: new Date(j.publishedAt).getTime() })); } catch (e) { return []; } });
    const breezyPromises = breezyBoards.map(async board => { try { const r = await fetch(`https://${board}.breezy.hr/json`, { headers }); const d = await r.json(); return Array.isArray(d) ? d.map(j => ({ company: board.toUpperCase(), title: j.name, url: j.url, salary: "Not listed", location: j.location?.name || "Remote", source: "Breezy", postedAt: new Date(j.published_date).getTime() })) : []; } catch (e) { return []; } });
    const bambooPromises = bambooBoards.map(async board => { try { const r = await fetch(`https://${board}.bamboohr.com/careers/list`, { headers }); const d = await r.json(); return (d.result || []).map(j => ({ company: board.toUpperCase(), title: j.jobTitle, url: `https://${board}.bamboohr.com/careers/${j.id}`, salary: "Not listed", location: j.location?.city ? `${j.location.city}, ${j.location.state}` : "Remote", source: "BambooHR", postedAt: Date.now() })); } catch (e) { return []; } });
    const smartRecruitersPromises = smartRecruitersBoards.map(async board => { try { const r = await fetch(`https://api.smartrecruiters.com/v1/companies/${board}/postings`, { headers }); const d = await r.json(); return (d.content || []).map(j => ({ company: board.toUpperCase(), title: j.name, url: `https://jobs.smartrecruiters.com/${board}/${j.ref}`, salary: "Not listed", location: j.location?.city || "Remote", source: "SmartRecruiters", postedAt: new Date(j.releasedDate).getTime() })); } catch (e) { return []; } });
    const workablePromises = workableBoards.map(async board => { try { const r = await fetch(`https://www.workable.com/api/accounts/${board}?details=false`, { headers }); const d = await r.json(); return (d.jobs || []).map(j => ({ company: board.toUpperCase(), title: j.title, url: j.url, salary: "Not listed", location: j.location?.country || "Remote", source: "Workable", postedAt: new Date(j.created_at).getTime() })); } catch (e) { return []; } });
    const recruiteePromises = recruiteeBoards.map(async board => { try { const r = await fetch(`https://${board}.recruitee.com/api/offers`, { headers }); const d = await r.json(); return (d.offers || []).map(j => ({ company: board.toUpperCase(), title: j.title, url: j.careers_url, salary: "Not listed", location: j.location || "Remote", source: "Recruitee", postedAt: new Date(j.published_at).getTime() })); } catch (e) { return []; } });

    // =========================================================
    // 3. AGGREGATORS
    // =========================================================
    const standalonePromises = [
      (async () => { try { const r = await fetch('https://remotive.com/api/remote-jobs?category=teaching', { headers }); const d = await r.json(); return (d.jobs || []).map(j => ({ company: j.company_name, title: j.title, url: j.url, salary: j.salary || "Not listed", location: j.candidate_required_location || "", source: "Remotive", postedAt: new Date(j.publication_date).getTime() })); } catch (e) { return []; } })(),
      (async () => { try { const r = await fetch('https://himalayas.app/jobs/api?limit=100', { headers }); const d = await r.json(); return (d.jobs || []).map(j => ({ company: j.companyName, title: j.title, url: j.applyUrl, salary: "Not listed", location: j.locationRestrictions?.join(', ') || "Worldwide", source: "Himalayas", postedAt: j.pubDate })); } catch (e) { return []; } })(),
      (async () => { try { const r = await fetch('https://remoteok.com/api', { headers }); const d = await r.json(); return (Array.isArray(d) && d.length > 1) ? d.slice(1).map(j => ({ company: j.company, title: j.position, url: j.url, salary: "Not listed", location: j.location || "", source: "RemoteOK", postedAt: new Date(j.date).getTime() })) : []; } catch (e) { return []; } })(),
      (async () => { try { const r = await fetch('https://weworkremotely.com/categories/remote-education-jobs.json', { headers }); const d = await r.json(); return (d.jobs || []).map(j => ({ company: j.company, title: j.subject, url: j.url, salary: "Not listed", location: j.region || "Remote", source: "WWR", postedAt: new Date(j.created_at).getTime() })); } catch (e) { return []; } })(),
      (async () => { try { const r = await fetch('https://findwork.dev/api/jobs/?search=instructional', { headers }); const d = await r.json(); return (d.results || []).map(j => ({ company: j.company_name, title: j.role, url: j.url, salary: "Not listed", location: j.location || "Remote", source: "FindWork", postedAt: new Date(j.date_posted).getTime() })); } catch (e) { return []; } })(),
      (async () => { try { const r = await fetch('https://www.arbeitnow.com/api/job-board-api', { headers }); const d = await r.json(); return (d.data || []).map(j => ({ company: j.company_name, title: j.title, url: j.url, salary: "Not listed", location: j.location || "Remote", source: "Arbeitnow", postedAt: new Date(j.created_at).getTime() })); } catch (e) { return []; } })(),
      (async () => { try { const r = await fetch('https://www.themuse.com/api/public/jobs?category=Education&category=Software%20Engineer&location=Flexible%20%2F%20Remote&page=1', { headers }); const d = await r.json(); return (d.results || []).map(j => ({ company: j.company.name, title: j.name, url: j.refs.landing_page, salary: "Not listed", location: j.locations?.map(l=>l.name).join(', ') || "Remote", source: "The Muse", postedAt: new Date(j.publication_date).getTime() })); } catch (e) { return []; } })()
    ];

    const allPromises = [
      ...greenhousePromises, ...leverPromises, ...workdayPromises, 
      ...ashbyPromises, ...breezyPromises, ...bambooPromises,
      ...smartRecruitersPromises, ...workablePromises, ...recruiteePromises,
      ...standalonePromises
    ];

    const results = await Promise.allSettled(allPromises);
    const allRawJobs = results.filter(r => r.status === 'fulfilled').flatMap(r => r.value);

    // =========================================================
    // 5. THE DYNAMIC GUI BOUNCER
    // =========================================================
    
    // Default values if the app hasn't set them yet
    const rawVip = body.vip || "instructional, curriculum, esl, edtech, e-learning, elearning, lxd, learning experience, educational, l&d, learning, education, trainer, training, subject matter expert, sme, course, bilingual, teacher, educator, lms, technologist, localization, linguist, frontend, front-end, react, web developer, learning engineer, javascript";
    const rawBanned = body.banned || "machine learning, deep learning, sales, marketing, data scientist, backend, data engineer, account executive, customer success, manager, director, vp, head, principal, counsel, finance, payroll";
    const rawLocations = body.locations || "uk only, europe, emea, apac, asia, uk/eu, india, australia, philippines";

    // Convert the comma-separated strings from your GUI into arrays
    const vipList = rawVip.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    const bannedList = rawBanned.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    const bannedLocations = rawLocations.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

    const strictlyFiltered = allRawJobs.filter(job => {
      if (job.postedAt && job.postedAt < cutoffDate) return false;

      const title = (job.title || "").toLowerCase();
      const loc = (job.location || "").toLowerCase();

      if (bannedLocations.some(badLoc => loc.includes(badLoc))) return false;
      if (bannedList.some(badWord => title.includes(badWord))) return false;
      return vipList.some(goodWord => title.includes(goodWord));
    });

    const uniqueJobs = Array.from(new Map(strictlyFiltered.map(job => [job.url, job])).values());

    if (uniqueJobs.length === 0) {
      return res.status(200).json({ jobs: [] });
    }

    const finalJobs = uniqueJobs.slice(0, 50).map(job => ({
      company: job.company,
      role: job.title.replace(/<\/?[^>]+(>|$)/g, ""),
      url: job.url,
      salary: job.salary,
      notes: `Src: ${job.source} | Posted: ${job.postedAt ? Math.round((Date.now() - job.postedAt) / (1000 * 60 * 60 * 24)) : '?'}d ago`,
      stage: "inbox"
    }));

    res.status(200).json({ jobs: finalJobs });

  } catch (error) {
    console.error("LifeOS GUI API Error:", error);
    res.status(500).json({ error: "Failed to fetch job leads." });
  }
}
