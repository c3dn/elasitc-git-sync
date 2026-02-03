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
		client: {start:"_app/immutable/entry/start.FTMQcsBV.js",app:"_app/immutable/entry/app.Y0d5rgoS.js",imports:["_app/immutable/entry/start.FTMQcsBV.js","_app/immutable/chunks/DUTeUus3.js","_app/immutable/chunks/O7RWNxBF.js","_app/immutable/chunks/C9NYA0Nw.js","_app/immutable/entry/app.Y0d5rgoS.js","_app/immutable/chunks/C9NYA0Nw.js","_app/immutable/chunks/O7RWNxBF.js","_app/immutable/chunks/CWj6FrbW.js","_app/immutable/chunks/D2ldot_M.js","_app/immutable/chunks/Cs0PMOxO.js","_app/immutable/chunks/CqRNeN1-.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./chunks/0-IWNokVD0.js')),
			__memo(() => import('./chunks/1-1pHfgiXB.js')),
			__memo(() => import('./chunks/2-DrXDCiw9.js')),
			__memo(() => import('./chunks/3-DNaFSpMU.js')),
			__memo(() => import('./chunks/4-zZx4b8h0.js')),
			__memo(() => import('./chunks/5-BKyCULXM.js')),
			__memo(() => import('./chunks/6-Qvbpq77z.js')),
			__memo(() => import('./chunks/7-C-eSorUm.js')),
			__memo(() => import('./chunks/8-CBfVeEKm.js')),
			__memo(() => import('./chunks/9-kq1paT5Z.js')),
			__memo(() => import('./chunks/10-B-DuxNV9.js')),
			__memo(() => import('./chunks/11-DyhtYxw8.js')),
			__memo(() => import('./chunks/12-Gs9gWKLB.js')),
			__memo(() => import('./chunks/13-OrOe7wF0.js')),
			__memo(() => import('./chunks/14-dK_GZtOS.js')),
			__memo(() => import('./chunks/15-BmHk1oXT.js')),
			__memo(() => import('./chunks/16-COPd1BrW.js')),
			__memo(() => import('./chunks/17-C1t3biY-.js')),
			__memo(() => import('./chunks/18-B6ZwyQSG.js'))
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
				id: "/audit",
				pattern: /^\/audit\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 4 },
				endpoint: null
			},
			{
				id: "/conflicts",
				pattern: /^\/conflicts\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 5 },
				endpoint: null
			},
			{
				id: "/history",
				pattern: /^\/history\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 6 },
				endpoint: null
			},
			{
				id: "/login",
				pattern: /^\/login\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 7 },
				endpoint: null
			},
			{
				id: "/logout",
				pattern: /^\/logout\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 8 },
				endpoint: null
			},
			{
				id: "/projects",
				pattern: /^\/projects\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 9 },
				endpoint: null
			},
			{
				id: "/projects/new",
				pattern: /^\/projects\/new\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 12 },
				endpoint: null
			},
			{
				id: "/projects/[id]",
				pattern: /^\/projects\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 10 },
				endpoint: null
			},
			{
				id: "/projects/[id]/edit",
				pattern: /^\/projects\/([^/]+?)\/edit\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 11 },
				endpoint: null
			},
			{
				id: "/review",
				pattern: /^\/review\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 13 },
				endpoint: null
			},
			{
				id: "/settings",
				pattern: /^\/settings\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 14 },
				endpoint: null
			},
			{
				id: "/settings/account",
				pattern: /^\/settings\/account\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 15 },
				endpoint: null
			},
			{
				id: "/settings/elastic",
				pattern: /^\/settings\/elastic\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 16 },
				endpoint: null
			},
			{
				id: "/settings/git",
				pattern: /^\/settings\/git\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 17 },
				endpoint: null
			},
			{
				id: "/settings/webhooks",
				pattern: /^\/settings\/webhooks\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 18 },
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
