import { HighlightedError } from "../types";

export const input = [
    {
        id: 1,
        original_text: "周一, 斯坦福大学医学院的科学家宣布, 他们发明了一种可以将细胞按类型分类的新型诊断工具:一种可打印的微型芯片. 这种芯片可以使用标准喷墨打印机制造, 每片价格可能在一美分左右.",
        translated_text: "On Monday, scientists from the Stanford University School of Medicine announced the invention of a new diagnostic tool that can sort cells by type: a tiny printable chip that can be manufactured using standard inkjet printers for possibly about one U.S. cent each.",
        errorSpans: [
            {
                original_text: "赢得比赛",
                translated_text: "win the game",
                correct_text: "win the match",
                start_index_orig: 2,
                end_index_orig: 3,
                start_index_translation: 9,
                end_index_translation: 14,
                error_type: "Hallucinations"
            } as HighlightedError,
            {
                original_text: "赢得比赛",
                translated_text: "win the game",
                correct_text: "win the match",
                start_index_orig: 4,
                end_index_orig: 9,
                start_index_translation: 19,
                end_index_translation: 28,
                error_type: "Addition of Text"
            } as HighlightedError,
            {
                original_text: "赢得比赛",
                translated_text: "win the game",
                correct_text: "win the match",
                start_index_orig: 15,
                end_index_orig: 20,
                start_index_translation: 49,
                end_index_translation: 65,
                error_type: "Addition of Text"
            } as HighlightedError,
        ]
    },
    {
        id: 2,
        original_text: "主要研究人员表示, 这可以让低收入国家/地区的患者尽早发现癌症, 肺结核, 艾滋病和疟疾. 在这些国家/地区, 乳腺癌等疾病的生存率可能仅为富裕国家的一半.",
        translated_text: "Lead researchers say this may bring early detection of cancer, tuberculosis, HIV and malaria to patients in low-income countries, where the survival rates for illnesses such as breast cancer can be half those of richer countries.",
        errorSpans: [
            {
                original_text: "赢得比赛",
                translated_text: "win the game",
                correct_text: "win the match",
                start_index_orig: 2,
                end_index_orig: 3,
                start_index_translation: 9,
                end_index_translation: 14,
                error_type: "Hallucinations"
            } as HighlightedError,
            {
                original_text: "赢得比赛",
                translated_text: "win the game",
                correct_text: "win the match",
                start_index_orig: 4,
                end_index_orig: 9,
                start_index_translation: 19,
                end_index_translation: 28,
                error_type: "Addition of Text"
            } as HighlightedError,
            {
                original_text: "赢得比赛",
                translated_text: "win the game",
                correct_text: "win the match",
                start_index_orig: 15,
                end_index_orig: 20,
                start_index_translation: 49,
                end_index_translation: 65,
                error_type: "Addition of Text"
            } as HighlightedError,
        ]
    }
]