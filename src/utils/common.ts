export const getDiamondCodes = (stoneData: any) => {
    const result = { lab: [], natural: [] };

    stoneData.forEach(item => {
        const parts = item.StockID.split(" "); // ["IGI", "LG717596099"]
        const lab = parts[0];
        const diamondCode = parts[1] || null;

        const formatted = {
            diamondCode,
            lab,
            image_url: null,
            videourl: null,
            stoneType: item.StoneType.toLowerCase().includes("lab")
                ? "lab"
                : "natural"
        };

        if (formatted.stoneType === "lab") {
            result.lab.push(formatted);
        } else {
            result.natural.push(formatted);
        }
    });

    return result;

};

export const  capitalizeWords= (str: string): string =>{
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}