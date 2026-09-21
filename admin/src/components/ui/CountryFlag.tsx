import { isoCodeToFlagEmoji } from '@/lib/isoCountryFlag';

type Props = {
  isoCode: string;
  className?: string;
  title?: string;
};

export function CountryFlag({ isoCode, className, title }: Props) {
  const flag = isoCodeToFlagEmoji(isoCode);
  if (!flag) return null;
  return (
    <span
      className={['select-none', className].filter(Boolean).join(' ')}
      title={title}
      aria-hidden
    >
      {flag}
    </span>
  );
}
