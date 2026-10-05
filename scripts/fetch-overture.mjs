import { DuckDBInstance } from '@duckdb/node-api';
import { mkdirSync, writeFileSync } from 'node:fs';

const center={lat:37+13/60+38.94/3600,lng:-(80+25/60+19.70/3600)};
const release='2026-09-23.1';
const instance=await DuckDBInstance.create(':memory:');
const db=await instance.connect();
await db.run("SET s3_region='us-west-2'");
await db.run("SET enable_progress_bar=true");
console.log(`Querying Overture ${release} places around Virginia Tech...`);
const sql=`SELECT id, names.primary AS name, taxonomy.primary AS category, taxonomy.hierarchy AS hierarchy,
  addresses[1].freeform AS address, websites[1] AS website, bbox.xmin AS lng, bbox.ymin AS lat, confidence
  FROM read_parquet('s3://overturemaps-us-west-2/release/${release}/theme=places/type=place/*', filename=true, hive_partitioning=1)
  WHERE bbox.xmin BETWEEN ${center.lng-.183} AND ${center.lng+.183}
    AND bbox.ymin BETWEEN ${center.lat-.146} AND ${center.lat+.146}
    AND names.primary IS NOT NULL
    AND (list_contains(taxonomy.hierarchy,'restaurant') OR list_contains(taxonomy.hierarchy,'cafe') OR list_contains(taxonomy.hierarchy,'fast_food'))`;
const reader=await db.runAndReadAll(sql);
const rows=reader.getRowObjectsJson();
mkdirSync('tmp/osm',{recursive:true});
writeFileSync('tmp/osm/overture-places.json',JSON.stringify({center,release,retrieved:new Date().toISOString(),rows},null,2));
console.log(JSON.stringify({count:rows.length,sample:rows.slice(0,10)},null,2));
db.closeSync();
