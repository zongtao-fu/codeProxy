import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES, LANGUAGE_LABEL_KEYS, STORAGE_KEY_LANGUAGE } from "@/utils/constants";
import type { Language } from "@/types";
import { Select } from "@/modules/ui/Select";

export function LanguageSelector({ className }: { className?: string }) {
    const { i18n, t } = useTranslation();

    const handleLanguageChange = (lng: string) => {
        i18n.changeLanguage(lng).catch(console.error);
        try {
            localStorage.setItem(STORAGE_KEY_LANGUAGE, JSON.stringify({ language: lng, state: { language: lng } }));
        } catch {
            // ignore
        }
    };

    const currentLanguage = i18n.language as Language;
    const currentValue = SUPPORTED_LANGUAGES.find(
        (lng) => currentLanguage?.startsWith(lng) || (lng === "zh-CN" && currentLanguage?.startsWith("zh")),
    ) ?? SUPPORTED_LANGUAGES[0];

    const options = SUPPORTED_LANGUAGES.map((lng) => ({
        value: lng,
        label: t(LANGUAGE_LABEL_KEYS[lng]),
    }));

    return (
        <Select
            value={currentValue}
            onChange={handleLanguageChange}
            options={options}
            aria-label={t("language.switch")}
            className={className}
        />
    );
}
