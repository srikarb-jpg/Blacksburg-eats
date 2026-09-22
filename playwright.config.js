import { defineConfig } from '@playwright/test';
export default defineConfig({
 testDir:'./tests', fullyParallel:false, workers:1,
 use:{baseURL:'http://127.0.0.1:5174',channel:'chrome',headless:true,viewport:{width:1440,height:1000}},
 webServer:{command:'node server.mjs',url:'http://127.0.0.1:5174',reuseExistingServer:false,env:{PORT:'5174',DB_PATH:`data/test-${Date.now()}.sqlite`}},
 reporter:'list'
});
