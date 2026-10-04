import { useEffect, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowUpRight, Moon, Sun, Wheat } from 'lucide-react';
import { LATEST_APK_URL } from './lib/downloads';
import './landing.css';

const email = 'grainhabit.support@gmail.com';
const links = [['/privacy', 'Privacy'], ['/terms', 'Terms'], ['/support', 'Support'], ['/delete-account', 'Delete your data']];

export function SiteLinks() {
  return <nav className="g-site-links g-wrap" aria-label="Information and support">{links.map(([href, label]) => <a key={href} href={href}>{label}</a>)}</nav>;
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return <section className="g-policy-block"><h2>{title}</h2>{children}</section>;
}

const pages: Record<string, { title: string; intro: string; content: ReactNode }> = {
  '/privacy': {
    title: 'Privacy policy', intro: 'A clear look at the information Grain uses and the choices you have.',
    content: <>
      <Block title="Who we are"><p>Grain is a habit and goal tracker maintained by Ronit Sharma. For privacy questions or requests, contact <a href={`mailto:${email}`}>{email}</a>. This policy covers the Grain Android app and this website.</p></Block>
      <Block title="Information you provide"><p>When you create an account, Firebase Authentication handles your email and sign-in credentials. Your account may also include your name and, when you choose Google sign-in, profile information provided by Google.</p><p>The current app stores your habits, goals, completion history, and preferences on your device. Older app versions may have stored profile and progress records in Firebase Firestore; the app can import those records, and older cloud copies may remain until deleted.</p><p>If you send feedback, we receive your message, category, rating, and any name or email you include. Feedback can also include your account identifier, browser or device user-agent, and screen dimensions to help investigate problems.</p></Block>
      <Block title="Wallpapers, widgets, and permissions"><p>Wallpaper and widget features use your progress and preferences on your device. A photo you select can be stored locally for your wallpaper. Wallpapers and widgets can make progress visible to people who can see your screen. Android may ask for notification or wallpaper permissions when you use those features; you can manage permissions in your device settings.</p></Block>
      <Block title="How information is used"><p>We use account information to provide sign-in, locally stored progress to run the tracker and device features, and feedback to respond to requests and troubleshoot Grain.</p><p>Firebase provides authentication and stores submitted feedback and legacy cloud records. Read <a href="https://firebase.google.com/support/privacy" target="_blank" rel="noreferrer">Firebase’s privacy and security information</a> for its processing practices. Our website is hosted by Vercel and downloads are hosted on GitHub; these providers may process connection information such as IP addresses and request logs. Information handled by providers may be processed outside your country.</p></Block>
      <Block title="Website storage"><p>This website saves your light or dark theme preference in your browser’s local storage. It loads the Inter font from Google Fonts, which sends a request to Google. The current website and app code do not include advertising trackers or an analytics SDK.</p></Block>
      <Block title="Retention and your choices"><p>Local progress stays on your device until you remove it. Export a backup before clearing app storage or uninstalling; signing out does not erase all local records. Account, feedback, and legacy cloud records are retained until removed or no longer needed for the service or support request. Provider backups and security logs may have separate retention periods.</p><p>You can ask for access, correction, or deletion of information associated with your account by emailing support. See <a href="/delete-account">Delete your data</a> for the process. Rights and available remedies depend on where you live. You can also contact your local privacy authority.</p></Block>
      <Block title="Security and changes"><p>Keep your device and exported backups secure. No storage or transmission method can guarantee complete security. If you believe a child has supplied personal information without appropriate permission, contact support so we can investigate and remove it. We will update this page when these practices change and show the revision date below.</p></Block>
    </>,
  },
  '/terms': {
    title: 'Terms of use', intro: 'The basics of using Grain and caring for your progress.',
    content: <>
      <Block title="Using Grain"><p>By using Grain, you agree to these terms. Use the app and website lawfully, keep your account credentials secure, and use only photos and other content you have permission to use. Do not misuse the service, interfere with other accounts, or attempt unauthorized access.</p></Block>
      <Block title="Your content and backups"><p>Your habits, goals, and photos remain yours. You permit Grain to process information you provide as needed to deliver the features you choose. The current tracker stores progress locally: keep exported backups, especially before clearing storage, changing devices, or uninstalling.</p></Block>
      <Block title="Availability and device features"><p>Grain is currently free and available for Android. Features may change as the app develops. Reminders, widgets, and live wallpapers depend on Android permissions, launcher support, and device power settings. Downloads and account services may be temporarily unavailable.</p></Block>
      <Block title="A tool for everyday progress"><p>Grain supports personal organization and habit tracking. It does not provide professional medical or other specialist advice and cannot guarantee particular outcomes. To the extent permitted by applicable law, the service is provided as available without a guarantee of uninterrupted operation or freedom from errors. These terms do not limit rights that cannot legally be excluded.</p></Block>
      <Block title="Contact and updates"><p>Questions about these terms can be sent to <a href={`mailto:${email}`}>{email}</a>. Changes will be published here with an updated revision date. Our <a href="/privacy">privacy policy</a> explains how information is handled.</p></Block>
    </>,
  },
  '/support': {
    title: 'A little help, when you need it.', intro: 'Installation, wallpapers, backups, and a direct line to the person building Grain.',
    content: <>
      <Block title="Get the latest Android app"><p><a href={LATEST_APK_URL}>Download the latest Grain APK <ArrowUpRight size={14} /></a>. Open the file on your Android device and follow the installation prompts. Android may ask you to allow installation from your browser. Install updates over the existing app to preserve its local data.</p></Block>
      <Block title="Set up a wallpaper"><p>Open the wallpaper editor in Grain. Choose your layout, theme, and color, then adjust its position in the preview. Select Apply Live Wallpaper or Set Static and finish the Android confirmation. Available home and lock screen choices depend on your device.</p><p>If a live wallpaper stops updating, reopen Grain and check battery restrictions for the app. If an appearance change does not apply, reopen the editor and complete the Apply step again.</p></Block>
      <Block title="Keep your progress safe"><p>Use the app’s backup export before changing devices, clearing app storage, or uninstalling. Keep that file somewhere private. Signing in on another device does not automatically restore the current locally stored tracker data; use your exported backup.</p></Block>
      <Block title="Report a problem or share an idea"><p>Use Feedback inside the app or email <a href={`mailto:${email}`}>{email}</a>. For a bug, include your Grain version, phone model, Android version, and the steps that led to the problem. Screenshots help; remove private information first. Never send your password.</p></Block>
      <Block title="Account and privacy requests"><p>For account deletion or removal of stored information, follow <a href="/delete-account">Delete your data</a>. Read the <a href="/privacy">privacy policy</a> for the information Grain handles.</p></Block>
    </>,
  },
  '/delete-account': {
    title: 'Delete your account and data', intro: 'Control what stays on your device and what is held by the account service.',
    content: <>
      <Block title="Request account deletion"><p>Email <a href={`mailto:${email}?subject=Grain%20account%20deletion`}>{email}</a> with the subject “Grain account deletion”, preferably from the email linked to your Grain account. Tell us whether you want your account deleted, associated cloud data removed, and submitted feedback deleted. Do not send your password.</p><p>We may ask you to verify ownership before removing account information. This is a manual support request; opening the email link does not delete anything automatically.</p></Block>
      <Block title="What the request covers"><p>A verified request can cover your Firebase sign-in account, associated profile and legacy cloud progress records, and feedback that can be linked to you. Provider backups or security records may persist according to provider retention practices or legal requirements. We will explain any applicable exceptions when handling your request.</p></Block>
      <Block title="Remove data from your device"><p>Cloud account deletion does not remotely erase local app storage, exported backups, or wallpaper images. Export a backup first if you want to keep your progress. Then clear Grain’s storage in Android Settings or uninstall it, and remove any backup files you no longer want. Replace your wallpaper and remove home screen widgets if you want to stop displaying your progress.</p></Block>
      <Block title="Need help deciding?"><p>You can also request access or correction without deleting your account. Contact <a href={`mailto:${email}`}>{email}</a> and describe what you need. See our <a href="/privacy">privacy policy</a> for more detail.</p></Block>
    </>,
  },
};

export function SitePage({ path }: { path: string }) {
  const page = pages[path];
  const [light, setLight] = useState(() => { try { return localStorage.getItem('grain-site-theme') === 'light'; } catch { return false; } });
  useEffect(() => {
    document.documentElement.dataset.theme = light ? 'light' : 'dark';
    try { localStorage.setItem('grain-site-theme', light ? 'light' : 'dark'); } catch { /* Optional storage. */ }
  }, [light]);
  useEffect(() => { document.title = `${page?.title ?? 'Page not found'} — Grain`; }, [page]);
  return <div className="grain-site g-info-page"><header className="g-header g-wrap"><a className="g-brand" href="/" aria-label="Grain home"><Wheat size={26} />grain</a><button className="g-theme glass" onClick={() => setLight(!light)} aria-label={`Switch to ${light ? 'dark' : 'light'} theme`}>{light ? <Moon size={19} /> : <Sun size={19} />}</button></header><main className="g-policy g-wrap"><a className="g-text-link" href="/"><ArrowLeft size={16} />Back to Grain</a><span className="g-eyebrow">A little clarity</span><h1>{page?.title ?? 'Page not found'}</h1><p className="g-policy-intro">{page?.intro ?? 'This page is not available. Head back to Grain to find your way.'}</p>{page && <><p className="g-policy-date">Updated October 5, 2026</p><div className="g-policy-content">{page.content}</div></>}</main><SiteLinks /><p className="g-maker-credit">Made With &lt;3 By Ronit Sharma</p></div>;
}
