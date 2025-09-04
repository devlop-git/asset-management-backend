export const labStoneQuery = (diamondCodes:any)=>{
    const formatted = diamondCodes.map(code => `'${code}'`).join(",");
    const query = `
    SELECT t2.image_url ,t2.video_url ,t2.cert 
        FROM nj_lab_price0   t1
        LEFT JOIN nj_lab_price_description t2
        ON t1.stone_price_id = t2.stone_price_id 
        where t1.diamond_code  in (${formatted});
    `
    console.log("lab",query);
    return query
}

export const naturalStoneQuery = (diamondCodes:any)=>{
    const formatted = diamondCodes.map(code => `'${code}'`).join(",");
    const query = `
    SELECT t2.image_url ,t2.video_url ,t2.cert 
        FROM nj_stone_price0   t1
        LEFT JOIN nj_stone_price_description t2
        ON t1.stone_price_id = t2.stone_price_id 
        where t1.diamond_code  in (${formatted});
    `
    console.log("natural",query);
    return query
}

export const dfeStoneQuery = ()=>{
    const query = `
    SELECT TOP 100
          dds.*,
          acs."ItemName",
          acs."ItemTypeNM",
          acs."TagNo",
          acs."CostPrice",
          acsb."RawMaterialTypeNm",
          acs."ProductID",
          acsb."StockBOMID"
      FROM "DiamondDemandSheet" dds
      INNER JOIN "AcCurrentStock" acs
          ON dds."OrderNo" = acs."OrderNo"
      INNER JOIN "AcCurrentStockBOM" acsb
          ON acs."StockID" = acsb."StockID"
      WHERE acsb."RawMaterialTypeNm" IN ('Diamond','Lab-created diamond')
        AND dds."Status" IN (
              'Received',
              'Vendor Assign',
              'Vendor Assign Internatioanly',
              'Vendor Assign Internationally',
              'Order Placed'
          )
        AND dds."AvgWt" > 0.17
        AND dds."StockID" IS NOT NULL
      ORDER BY dds."OrderRecdDate" DESC
    `
    return query
}

