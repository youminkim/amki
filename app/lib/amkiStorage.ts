export interface AmkiItem {
    id: number;
    image: string | null;
    qaPairs: Array<{ question: string; answer: string }>;
    createdAt: string;
}

export const saveAmkiItem = (
    image: string | null,
    qaPairs: Array<{ question: string; answer: string }>
): AmkiItem => {
    const savedItems = JSON.parse(localStorage.getItem("amkiItems") || "[]");
    const newItem: AmkiItem = {
        id: Date.now(),
        image,
        qaPairs: qaPairs.filter((pair) => pair.question.trim() !== ""),
        createdAt: new Date().toISOString(),
    };

    localStorage.setItem("amkiItems", JSON.stringify([...savedItems, newItem]));
    return newItem;
};

export const getAmkiItems = (): AmkiItem[] => {
    return JSON.parse(localStorage.getItem("amkiItems") || "[]");
};

export const getAmkiCount = (): number => {
    return getAmkiItems().length;
};
