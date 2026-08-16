import { useI18n } from '@/i18n';
import { Smartphone, Heart } from 'lucide-react';

export function Footer() {
  const { t } = useI18n();

  return (
    <footer className="border-t border-white/10 bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500">
              <Smartphone className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-white">TopUp DZ</span>
          </div>
          <p className="text-sm text-slate-500 text-center">{t('footer.tagline')}</p>
          <p className="text-xs text-slate-600 flex items-center gap-1">
            Made with <Heart className="h-3 w-3 text-red-500" /> © 2026 TopUp DZ. {t('footer.rights')}
          </p>
        </div>
      </div>
    </footer>
  );
}
