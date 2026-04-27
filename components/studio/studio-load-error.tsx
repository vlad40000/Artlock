interface StudioLoadErrorProps {
  title?: string;
  message?: string;
}

export function StudioLoadError({
  title = 'Studio could not load',
  message = 'The session could not be loaded. Check the server console and database migrations, then reload.',
}: StudioLoadErrorProps) {
  return (
    <div className="fixed inset-0 overflow-hidden bg-tls-grid bg-tls-bg bg-[length:48px_48px] grid place-items-center">
      <div className="bg-tls-panel border border-tls-border backdrop-blur-tls-28 shadow-tls-panel rounded-tls-28 flex flex-col overflow-hidden !static !w-[420px] !max-h-none">
        <div className="p-[22px_22px_18px] border-b border-tls-border-soft shrink-0">
          <div className="text-tls-muted text-[11px] font-black tracking-[0.22em] uppercase">Tattoo Lock System</div>
          <h2 className="text-tls-text text-[22px] font-black leading-[1.05]">{title}</h2>
        </div>
        <div className="p-[18px] overflow-y-auto flex-1">
          <p className="text-tls-muted text-sm leading-relaxed">{message}</p>
        </div>
        <div className="p-6 border-t border-white/5">
           <button onClick={() => window.location.reload()} className="border-0 rounded-tls-16 bg-white text-black text-[12px] font-black tracking-[0.16em] uppercase p-[16px_22px] cursor-pointer w-full">Reload Studio</button>
        </div>
      </div>
    </div>
  );
}
