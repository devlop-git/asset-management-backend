export const labStoneQuery = (diamondCodes: any) => {
  const formatted = diamondCodes.map(code => `'${code}'`).join(",");
  const query = `
    SELECT t2.image_url ,t2.video_url ,t2.cert 
        FROM nj_lab_price0   t1
        LEFT JOIN nj_lab_price_description t2
        ON t1.stone_price_id = t2.stone_price_id 
        where t1.diamond_code  in (${formatted});
    `
  console.log("lab", query);
  return query
}

export const naturalStoneQuery = (diamondCodes: any) => {
  const formatted = diamondCodes.map(code => `'${code}'`).join(",");
  const query = `
    SELECT t2.image_url ,t2.video_url ,t2.cert 
        FROM nj_stone_price0   t1
        LEFT JOIN nj_stone_price_description t2
        ON t1.stone_price_id = t2.stone_price_id 
        where t1.diamond_code  in (${formatted});
    `
  console.log("natural", query);
  return query
}

export const dfeStoneQuery = (page, pageSize) => {
  const offset = (page - 1) * pageSize;
  const query = `
  WITH RankedStocks AS (
    SELECT dds.*,
        acs.ItemName,
    acs.ItemTypeNM,
    acs.TagNo,
    acs.CostPrice,
    acsb.RawMaterialTypeNm,
    acs.ProductID,
    acsb.StockBOMID,
           ROW_NUMBER() OVER (PARTITION BY dds.StockID ORDER BY dds.OrderRecdDate DESC) AS rn
    FROM DiamondDemandSheet dds
    INNER JOIN AcCurrentStock acs
        ON dds.OrderNo = acs.OrderNo
    INNER JOIN AcCurrentStockBOM acsb
        ON acs.StockID = acsb.StockID
    WHERE acsb.RawMaterialTypeNm IN ('Diamond', 'Lab-created diamond')
      AND dds.Status IN (
            'Received',
            'Vendor Assign',
            'Vendor Assign Internationally',
            'Order Placed'
          )
      AND dds.AvgWt > 0.17
      AND dds.StockID IS NOT NULL
      AND (
            acs.StockStatus != 'Sold'
            OR (acs.StockStatus = 'Sold' AND dds.OrderRecdDate >= DATEADD(MONTH, -6, GETDATE()))
          )
)
SELECT *
FROM RankedStocks
WHERE rn = 1
ORDER BY OrderRecdDate DESC
OFFSET ${offset} ROWS
FETCH NEXT ${pageSize} ROWS ONLY;;
  `
  // const query = `
  // SELECT TOP 100
  //       dds.*,
  //       acs."ItemName",
  //       acs."ItemTypeNM",
  //       acs."TagNo",
  //       acs."CostPrice",
  //       acsb."RawMaterialTypeNm",
  //       acs."ProductID",
  //       acsb."StockBOMID"
  //   FROM "DiamondDemandSheet" dds
  //   INNER JOIN "AcCurrentStock" acs
  //       ON dds."OrderNo" = acs."OrderNo"
  //   INNER JOIN "AcCurrentStockBOM" acsb
  //       ON acs."StockID" = acsb."StockID"
  //   WHERE acsb."RawMaterialTypeNm" IN ('Diamond','Lab-created diamond')
  //     AND dds."Status" IN (
  //           'Received',
  //           'Vendor Assign',
  //           'Vendor Assign Internatioanly',
  //           'Vendor Assign Internationally',
  //           'Order Placed'
  //       )
  //     AND dds."AvgWt" > 0.17
  //     AND dds."StockID" IS NOT NULL
  //   ORDER BY dds."OrderRecdDate" DESC
  // `
  return query
}

export function getStockStonedataJoinQuery() {
  return `
    SELECT
      s.lab AS "CertificateType",
      s.certificate_no AS "CertificateNo",
      s.stone_type AS "StoneType",
      sd.shape AS "Shape",
      s.avg_weight AS "CaratAvgWt",
      sd.color AS "Color",
      sd.clarity AS "Clarity",
      sd.cut AS "Cut",
      sd.polish AS "Polish",
      sd.symmetry AS "Symmetry",
      sd.fluorescence AS "Fluorescence"
    FROM stock s
    LEFT JOIN stonedata sd
      ON s.certificate_no = sd.certificate_no
    WHERE s.is_active = true
      AND s.stock LIKE 'IGI %'
  `;
}

export const getStoneVendorQuery = (diamondCodes: any) => {
  const formatted = diamondCodes.map(code => `'${code}'`).join(",");
  const query = `Select * from Demand_APIResult_VendorOrder where cert in (${formatted})`;
  return query;
};

