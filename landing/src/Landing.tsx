import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUpRight, Check, Download, Flame, Layers, Moon, Sun, Target, Wheat } from 'lucide-react';
import { LATEST_APK_URL } from './lib/downloads';
import './landing.css';

const screens = [
  { name: 'Today', image: 'today.png', title: 'A little better. Every day.', copy: 'Bring your daily habits into focus. Show up, check in, and give yourself credit for the work.' },
  { name: 'Consistency', image: 'consistency.png', title: 'See how far you’ve grown.', copy: 'Follow your journey from the first small action to a routine that feels like second nature.' },
  { name: 'Deck', image: 'deck.png', title: 'Make room for what matters.', copy: 'Give your next action a place. A clear plan makes it easier to turn intention into progress.' },
];
const faqs = [
  ['What is Grain?', 'Grain is a habit and goal tracker for anyone building discipline. Bring your daily habits, goals, and plans together in one focused space.'],
  ['Is Grain free?', 'Yes. Grain is free for now. Download the Android app and start building your routine.'],
  ['Is it only for students?', 'Grain is for anyone building discipline. Use it for studying, movement, mindfulness, personal projects, or the habits that matter to you.'],
  ['How do I install it on Android?', 'Download grain.apk directly from our latest GitHub release. Open the downloaded file and follow Android’s installation prompts. You may need to allow your browser to install apps from this source.'],
  ['Is there an iPhone version?', 'Grain is currently available for Android.'],
];

export function Landing() {
  const [light, setLight] = useState(() => { try { return localStorage.getItem('grain-site-theme') === 'light'; } catch { return false; } });
  const [screen, setScreen] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [active, setActive] = useState('home');
  const navRef = useRef<HTMLElement>(null);
  const [lens, setLens] = useState({ left: 0, width: 0 });
  const [pressing, setPressing] = useState(false);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('g-revealed');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    const elements = document.querySelectorAll('.g-section-heading, .g-feature-card, .g-showcase-copy, .g-showcase-image, .g-steps article, .g-faq-list, .g-final .g-wrap, .g-detail-card');
    elements.forEach(element => { element.classList.add('g-reveal'); observer.observe(element); });
    return () => { observer.disconnect(); elements.forEach(element => element.classList.remove('g-reveal')); };
  }, []);
  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const measure = () => {
      const selected = nav.querySelector<HTMLAnchorElement>(`a[href="#${active}"]`);
      if (!selected) return;
      const navBounds = nav.getBoundingClientRect();
      const bounds = selected.getBoundingClientRect();
      setLens({ left: bounds.left - navBounds.left, width: bounds.width });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(nav);
    const selected = nav.querySelector('a.selected');
    if (selected) observer.observe(selected);
    document.fonts.ready.then(() => { if (nav.isConnected) measure(); });
    return () => observer.disconnect();
  }, [active]);
  useEffect(() => {
    document.documentElement.dataset.theme = light ? 'light' : 'dark';
    try { localStorage.setItem('grain-site-theme', light ? 'light' : 'dark'); } catch { /* Theme still works without storage. */ }
  }, [light]);
  useEffect(() => {
    if (!playing || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => setScreen(s => (s + 1) % screens.length), 5500);
    return () => window.clearInterval(timer);
  }, [playing]);
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) setActive(entry.target.id); });
    }, { rootMargin: '-15% 0px -55% 0px' });
    document.querySelectorAll('[data-nav-section]').forEach(section => observer.observe(section));
    return () => observer.disconnect();
  }, []);
  const download = (label = 'Download for Android') => <a className="g-button" href={LATEST_APK_URL}><Download size={17} />{label}<ArrowUpRight size={16} /></a>;
  return <div className="grain-site">
    <header className="g-header g-wrap"><a href="#home" className="g-brand" aria-label="Grain home"><Wheat size={26} />grain<span>®</span></a><span className="g-header-note">Small actions. Lasting change.</span><button className="g-theme glass" onClick={() => setLight(!light)} aria-label={`Switch to ${light ? 'dark' : 'light'} theme`}>{light ? <Moon size={19} /> : <Sun size={19} />}</button></header>
    <div className="g-nav-position"><nav ref={navRef} className="g-nav glass" aria-label="Main navigation" data-pressing={pressing || undefined} onPointerUp={() => setPressing(false)} onPointerCancel={() => setPressing(false)} onPointerLeave={() => setPressing(false)}><span className="g-nav-lens" style={{ left: lens.left, width: lens.width }} aria-hidden="true" />{[['home', 'Overview'], ['features', 'Features'], ['how-it-works', 'How it works'], ['faq', 'FAQ']].map(([id, label]) => <a key={id} href={`#${id}`} onPointerDown={() => setPressing(true)} onClick={() => setActive(id)} className={active === id ? 'selected' : ''} aria-current={active === id ? 'location' : undefined}>{label}</a>)}</nav><a className="g-nav-download glass" href={LATEST_APK_URL} aria-label="Download Grain for Android"><Download size={20} /></a></div>
    <main>
      <section id="home" data-nav-section className="g-hero g-wrap">
        <div className="g-hero-wheat" aria-hidden="true" />
        <div className="g-hero-copy"><span className="g-eyebrow"><span className="g-status" /> A quieter way to grow</span><h1>Discipline starts<br />with <span>one day.</span></h1><p>Build habits. Chase meaningful goals.<br className="g-desktop-break" /> Become the person you keep imagining.</p><div className="g-hero-actions">{download()}<a className="g-text-link" href="#preview">Meet Grain <ArrowDown size={15} /></a></div><div className="g-download-note">Free for now <span>·</span> Made for Android</div></div>
        <div className="g-hero-visual"><div className="g-orbit" /><span className="g-visual-label">YOUR NEXT CHAPTER</span><div className="g-phone"><div className="g-phone-speaker" />{screens.map((s, i) => <img key={s.name} src={`/screenshots/${s.image}`} alt={`Grain ${s.name} screen`} className={screen === i ? 'visible' : ''} />)}</div><div className="g-floating-card glass"><span className="g-check"><Check size={17} /></span><div>A promise kept.<small>One more day of showing up.</small></div></div><div className="g-preview-controls"><span>0{screen + 1} / 03</span><button onClick={() => setPlaying(!playing)} aria-label={playing ? 'Pause app preview' : 'Play app preview'}>{playing ? 'Pause preview' : 'Play preview'}</button></div></div>
        <div className="g-hero-bottom"><span>LESS NOISE. MORE INTENTION.</span><a href="#features" aria-label="Explore features"><ArrowDown size={18} /></a><span>BUILT AROUND YOUR EVERYDAY</span></div>
      </section>
      <section id="features" data-nav-section className="g-section g-wrap"><div className="g-section-heading"><span className="g-eyebrow">01 — Your daily essentials</span><h2>Everything you need.<br /><span>Space to focus.</span></h2><p>A considered home for your habits, goals, and everyday progress. Simple enough to keep coming back.</p></div><div className="g-feature-grid"><article className="g-feature-card g-feature-large"><Flame className="g-card-icon" size={24} /><h3>Show up for yourself.</h3><p>Build a daily rhythm with habits you care about. Every check-in is a small vote for who you want to become.</p><div className="g-habit-demo"><div><span className="g-check"><Check size={17} /></span><span>Read a chapter<small>A little knowledge, every day</small></span><span className="g-habit-streak">7 days <Flame size={13} /></span></div><div><span className="g-check"><Check size={17} /></span><span>5-minute meditation<small>Make a little space for yourself</small></span></div><div className="g-habit-pending"><span className="g-empty-check" /><span>Move your body<small>Your next small win</small></span></div></div></article><article className="g-feature-card"><Target className="g-card-icon" size={24} /><h3>Give ambition a direction.</h3><p>Keep meaningful goals in sight and connect your days to something bigger.</p><div className="g-target-art"><Target size={130} strokeWidth={0.6} /><span>ONE STEP CLOSER</span></div></article><article className="g-feature-card"><Layers className="g-card-icon" size={24} /><h3>A clearer kind of day.</h3><p>Sort your next actions in Deck. Decide what comes first and what can wait.</p><div className="g-mini-deck"><span>DO FIRST</span><strong>Make time<br />for deep work.</strong><span>MIND</span></div></article></div></section>
      <section id="preview" className="g-showcase"><div className="g-wrap g-showcase-grid"><div className="g-showcase-copy"><span className="g-eyebrow">Designed to feel like you</span><h2>Your rhythm.<br /><span>Your space.</span></h2><p>Quiet surfaces. Clear progress. A little breathing room. Take a closer look at your everyday companion.</p><div className="g-screen-tabs" role="tablist" aria-label="App screenshots">{screens.map((s, i) => <button key={s.name} id={`screen-tab-${i}`} role="tab" aria-selected={screen === i} aria-controls="screen-panel" className={screen === i ? 'selected' : ''} onClick={() => { setScreen(i); setPlaying(false); }}>{s.name}<ArrowUpRight size={16} /></button>)}</div><div className="g-screen-caption"><h3>{screens[screen].title}</h3><p>{screens[screen].copy}</p></div></div><div className="g-showcase-image" id="screen-panel" role="tabpanel" aria-labelledby={`screen-tab-${screen}`}><img key={screen} src={`/screenshots/${screens[screen].image}`} alt={`${screens[screen].name} view in Grain`} loading="lazy" /><span>GRAIN / {screens[screen].name.toUpperCase()}</span></div></div></section>
      <section className="g-details g-wrap" aria-label="A closer look at Grain"><div className="g-section-heading"><span className="g-eyebrow">The details make the difference</span><h2>Progress you can see.<br /><span>A feeling you can keep.</span></h2></div><div className="g-details-grid"><article className="g-detail-card"><div className="g-detail-crop g-detail-progress"><img src="/screenshots/consistency.png" alt="Your Journey showing daily progress, best streak, and completion rate" loading="lazy" /></div><div className="g-detail-copy"><span className="g-eyebrow">Every day counts</span><h3>Small wins. A bigger picture.</h3><p>Your daily progress and best streak, together at a glance.</p></div></article><article className="g-detail-card"><div className="g-detail-crop g-detail-journey"><img src="/screenshots/consistency.png" alt="Grain journey milestones: Plant the Goal and First Sprout" loading="lazy" /></div><div className="g-detail-copy"><span className="g-eyebrow">Rooted in your routine</span><h3>Watch your intention take root.</h3><p>A journey that grows with every meaningful action.</p></div></article></div></section>
      <section id="how-it-works" data-nav-section className="g-section g-wrap"><div className="g-section-heading"><span className="g-eyebrow">02 — Start small</span><h2>From intention<br /><span>to everyday action.</span></h2></div><div className="g-steps">{[['Choose your direction.', 'Pick a goal. Start with one habit that brings it closer.'], ['Make it part of your day.', 'Plan your actions and check in as you complete them.'], ['Watch yourself grow.', 'Follow your progress. Keep going, one day at a time.']].map(([title, copy], i) => <article key={title}><span className="g-step-number">0{i + 1}</span><h3>{title}</h3><p>{copy}</p></article>)}</div></section>
      <section id="faq" data-nav-section className="g-section g-wrap g-faq"><div><span className="g-eyebrow">03 — A little clarity</span><h2>Good questions.<br /><span>Simple answers.</span></h2></div><div className="g-faq-list">{faqs.map(([q, a]) => <details key={q}><summary>{q}<span>+</span></summary><p>{a}</p></details>)}</div></section>
      <section className="g-final"><div className="g-wrap"><Wheat size={36} strokeWidth={1} /><span className="g-eyebrow">Your first day starts here</span><h2>Small steps.<br /><span>A different tomorrow.</span></h2><p>You don’t need a perfect plan. Just a place to begin.</p>{download('Get Grain for Android')}<div className="g-download-note">Free for now. Yours to grow with.</div></div></section>
    </main><footer className="g-footer g-wrap"><a className="g-brand" href="#home"><Wheat size={23} />grain</a><span>Built for the person you’re becoming.</span><a href="https://github.com/sharmaronit/grain" target="_blank" rel="noreferrer">GitHub <ArrowUpRight size={14} /></a><span>© {new Date().getFullYear()} Grain</span></footer>
    <p className="g-maker-credit">Made With &lt;3 By Ronit Sharma</p>
  </div>;
}
