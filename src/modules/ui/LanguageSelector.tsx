import { useTranslation } from "react-i18next";
import { Languages } from "lucide-react";
import { SUPPORTED_LANGUAGES, STORAGE_KEY_LANGUAGE } from "@/utils/constants";
import type { Language } from "@/types";

export function LanguageSelector({ className }: { className?: string }) {
    const { i18n } = useTranslation();

    const currentLanguage = i18n.language as Language;
    const currentIndex = SUPPORTED_LANGUAGES.findIndex(
        (lng) => currentLanguage?.startsWith(lng) || (lng === "zh-CN" && currentLanguage?.startsWith("zh")),
    );

    const handleToggle = () => {
        const nextIndex = (currentIndex + 1) % SUPPORTED_LANGUAGES.length;
        const nextLang = SUPPORTED_LANGUAGES[nextIndex];
        i18n.changeLanguage(nextLang).catch(console.error);
        try {
            localStorage.setItem(STORAGE_KEY_LANGUAGE, JSON.stringify({ language: nextLang, state: { language: nextLang } }));
        } catch {
            // ignore
        }
    };

    const label = currentLanguage?.startsWith("zh") ? "Switch to English" : "切换到中文";

    return (
        <button
            type="button"
            onClick={handleToggle}
            className={className}
            aria-label={label}
            title={label}
        >
            <Languages size={16} />
        </button>
    );
}
