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
		client: {start:"_app/immutable/entry/start.BPhxsqR4.js",app:"_app/immutable/entry/app.BSg_DRJg.js",imports:["_app/immutable/entry/start.BPhxsqR4.js","_app/immutable/chunks/DrRDPxfg.js","_app/immutable/chunks/BCkVnCXK.js","_app/immutable/chunks/Dwc5JcvW.js","_app/immutable/entry/app.BSg_DRJg.js","_app/immutable/chunks/Dwc5JcvW.js","_app/immutable/chunks/BCkVnCXK.js","_app/immutable/chunks/CWj6FrbW.js","_app/immutable/chunks/BGM91MK6.js","_app/immutable/chunks/uIwwuFdP.js","_app/immutable/chunks/7ALa_3WU.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./chunks/0-BgVmdXsi.js')),
			__memo(() => import('./chunks/1-CGzluxwa.js')),
			__memo(() => import('./chunks/2-C88tSTIe.js')),
			__memo(() => import('./chunks/3-CEicDt-m.js')),
			__memo(() => import('./chunks/4-C7AjCnHm.js')),
			__memo(() => import('./chunks/5-BtoUFYsF.js')),
			__memo(() => import('./chunks/6-CIc9MUzY.js')),
			__memo(() => import('./chunks/7-DDbWDiQ1.js')),
			__memo(() => import('./chunks/8-BSSJQdsB.js')),
			__memo(() => import('./chunks/9-CQXTInnM.js')),
			__memo(() => import('./chunks/10-BQuwwU1n.js')),
			__memo(() => import('./chunks/11-fcntrONc.js')),
			__memo(() => import('./chunks/12-DheQJPAU.js')),
			__memo(() => import('./chunks/13-B5azMb_N.js')),
			__memo(() => import('./chunks/14-CItT1rK8.js'))
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
