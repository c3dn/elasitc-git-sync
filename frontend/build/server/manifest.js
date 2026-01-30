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
		client: {start:"_app/immutable/entry/start.MUr-wJgL.js",app:"_app/immutable/entry/app.C7rXYkdT.js",imports:["_app/immutable/entry/start.MUr-wJgL.js","_app/immutable/chunks/Cak3-npf.js","_app/immutable/chunks/BnHnlVXU.js","_app/immutable/chunks/BbuzmxRY.js","_app/immutable/entry/app.C7rXYkdT.js","_app/immutable/chunks/BbuzmxRY.js","_app/immutable/chunks/BnHnlVXU.js","_app/immutable/chunks/CWj6FrbW.js","_app/immutable/chunks/XgF_cVEg.js","_app/immutable/chunks/cVoOpi3M.js","_app/immutable/chunks/CnEfqjts.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./chunks/0-CXdnB0AI.js')),
			__memo(() => import('./chunks/1-CuPMMFrh.js')),
			__memo(() => import('./chunks/2-D439ymJi.js')),
			__memo(() => import('./chunks/3-Bgva0epX.js')),
			__memo(() => import('./chunks/4-CxLQCk6f.js')),
			__memo(() => import('./chunks/5-TxL0ORF8.js')),
			__memo(() => import('./chunks/6-CyYP8lSc.js')),
			__memo(() => import('./chunks/7-DDbWDiQ1.js')),
			__memo(() => import('./chunks/8-CP-tKRH4.js')),
			__memo(() => import('./chunks/9-CUkz4s0S.js')),
			__memo(() => import('./chunks/10-Cm3QBT00.js')),
			__memo(() => import('./chunks/11-BPnk_VNs.js')),
			__memo(() => import('./chunks/12-Cl7MEgP9.js')),
			__memo(() => import('./chunks/13-DWBXRS2Y.js')),
			__memo(() => import('./chunks/14-DuGVl7DZ.js')),
			__memo(() => import('./chunks/15-3H2mFsCl.js'))
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
				id: "/settings/account",
				pattern: /^\/settings\/account\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 13 },
				endpoint: null
			},
			{
				id: "/settings/elastic",
				pattern: /^\/settings\/elastic\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 14 },
				endpoint: null
			},
			{
				id: "/settings/git",
				pattern: /^\/settings\/git\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 15 },
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
