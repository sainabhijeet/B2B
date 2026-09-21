import { createLanguageContext } from "@/lib/localization-service";

type Props = {
  children: React.ReactNode;
  className?: string;
  languageCode?: string | null;
};

export default function StorefrontLocaleFrame({ children, className, languageCode }: Props) {
  const context = createLanguageContext(languageCode);
  return (
    <div lang={context.languageCode} dir={context.direction} className={className}>
      {children}
    </div>
  );
}
