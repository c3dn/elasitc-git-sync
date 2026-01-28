const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["favicon.png"]),
	mimeTypes: {".png":"image/png"},
	_: {
		client: {start:"_app/immutable/entry/start.V9Ki5wBm.js",app:"_app/immutable/entry/app.iObffodn.js",imports:["_app/immutable/entry/start.V9Ki5wBm.js","_app/immutable/chunks/CilZWO1z.js","_app/immutable/chunks/CdzGu8ER.js","_app/immutable/chunks/CbRa-Z4u.js","_app/immutable/entry/app.iObffodn.js","_app/immutable/chunks/CbRa-Z4u.js","_app/immutable/chunks/CdzGu8ER.js","_app/immutable/chunks/CWj6FrbW.js","_app/immutable/chunks/CoDRCLiZ.js","_app/immutable/chunks/BjUZiTXz.js","_app/immutable/chunks/MJCC_PoB.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./chunks/0-BqlbtDTP.js')),
			__memo(() => import('./chunks/1-e45gb2ST.js')),
			__memo(() => import('./chunks/2-COkqcKDT.js')),
			__memo(() => import('./chunks/3-DdtP5jEW.js')),
			__memo(() => import('./chunks/4-Bs-TvJq2.js')),
			__memo(() => import('./chunks/5-BE0qGndE.js')),
			__memo(() => import('./chunks/6-8TL4gl8E.js')),
			__memo(() => import('./chunks/7-DDbWDiQ1.js')),
			__memo(() => import('./chunks/8-BrojaKMp.js')),
			__memo(() => import('./chunks/9-D4Rwqdej.js')),
			__memo(() => import('./chunks/10-BqF0iRU2.js')),
			__memo(() => import('./chunks/11-BddnAZXU.js')),
			__memo(() => import('./chunks/12-82ontO58.js')),
			__memo(() => import('./chunks/13-BAhh08Bs.js')),
			__memo(() => import('./chunks/14-DEAtfPM8.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 3 },
				endpoint: null
			},
			{
				id: "/conflicts",
				pattern: /^\/conflicts\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 4 },
				endpoint: null
			},
			{
				id: "/history",
				pattern: /^\/history\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 5 },
				endpoint: null
			},
			{
				id: "/login",
				pattern: /^\/login\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 6 },
				endpoint: null
			},
			{
				id: "/logout",
				pattern: /^\/logout\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 7 },
				endpoint: null
			},
			{
				id: "/projects",
				pattern: /^\/projects\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 8 },
				endpoint: null
			},
			{
				id: "/projects/new",
				pattern: /^\/projects\/new\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 11 },
				endpoint: null
			},
			{
				id: "/projects/[id]",
				pattern: /^\/projects\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 9 },
				endpoint: null
			},
			{
				id: "/projects/[id]/edit",
				pattern: /^\/projects\/([^/]+?)\/edit\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 10 },
				endpoint: null
			},
			{
				id: "/settings",
				pattern: /^\/settings\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 12 },
				endpoint: null
			},
			{
				id: "/settings/elastic",
				pattern: /^\/settings\/elastic\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 13 },
				endpoint: null
			},
			{
				id: "/settings/git",
				pattern: /^\/settings\/git\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 14 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();

const prerendered = new Set([]);

const base = "";

export { base, manifest, prerendered };
//# sourceMappingURL=manifest.js.map
