export function Footer() {
  return (
    <footer className="py-16 border-t border-[color:var(--hairline)] relative z-10">
      <div className="container flex flex-col md:flex-row items-center justify-between gap-12 text-sm text-mute">
        <div>
          <span className="font-display font-bold text-ink mr-2">Grain</span>
          © {new Date().getFullYear()} Ronit Sharma
        </div>
        <div className="flex gap-8">
          <a href="https://github.com/sharmaronit/grain" target="_blank" rel="noreferrer" className="hover:text-ink transition">GitHub</a>
          <a href="#" className="hover:text-ink transition">Privacy Policy</a>
          <a href="#" className="hover:text-ink transition">Contact</a>
        </div>
        <div className="text-center md:text-right">
          <div>Made with discipline.</div>
          <div className="mt-1 text-xs text-mute">All rights reserved</div>
        </div>
      </div>
    </footer>
  );
}
