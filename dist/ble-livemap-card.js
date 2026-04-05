function e(e,t,i,o){var s,n=arguments.length,r=n<3?t:null===o?o=Object.getOwnPropertyDescriptor(t,i):o;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(e,t,i,o);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(r=(n<3?s(r):n>3?s(t,i,r):s(t,i))||r);return n>3&&r&&Object.defineProperty(t,i,r),r}"function"==typeof SuppressedError&&SuppressedError;const t=globalThis,i=t.ShadowRoot&&(void 0===t.ShadyCSS||t.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,o=Symbol(),s=new WeakMap;let n=class{constructor(e,t,i){if(this._$cssResult$=!0,i!==o)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=e,this.t=t}get styleSheet(){let e=this.o;const t=this.t;if(i&&void 0===e){const i=void 0!==t&&1===t.length;i&&(e=s.get(t)),void 0===e&&((this.o=e=new CSSStyleSheet).replaceSync(this.cssText),i&&s.set(t,e))}return e}toString(){return this.cssText}};const r=(e,...t)=>{const i=1===e.length?e[0]:t.reduce((t,i,o)=>t+(e=>{if(!0===e._$cssResult$)return e.cssText;if("number"==typeof e)return e;throw Error("Value passed to 'css' function must be a 'css' function result: "+e+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(i)+e[o+1],e[0]);return new n(i,e,o)},a=i?e=>e:e=>e instanceof CSSStyleSheet?(e=>{let t="";for(const i of e.cssRules)t+=i.cssText;return(e=>new n("string"==typeof e?e:e+"",void 0,o))(t)})(e):e,{is:l,defineProperty:c,getOwnPropertyDescriptor:d,getOwnPropertyNames:h,getOwnPropertySymbols:p,getPrototypeOf:_}=Object,g=globalThis,u=g.trustedTypes,f=u?u.emptyScript:"",v=g.reactiveElementPolyfillSupport,m=(e,t)=>e,y={toAttribute(e,t){switch(t){case Boolean:e=e?f:null;break;case Object:case Array:e=null==e?e:JSON.stringify(e)}return e},fromAttribute(e,t){let i=e;switch(t){case Boolean:i=null!==e;break;case Number:i=null===e?null:Number(e);break;case Object:case Array:try{i=JSON.parse(e)}catch(e){i=null}}return i}},b=(e,t)=>!l(e,t),x={attribute:!0,type:String,converter:y,reflect:!1,useDefault:!1,hasChanged:b};Symbol.metadata??=Symbol("metadata"),g.litPropertyMetadata??=new WeakMap;let $=class extends HTMLElement{static addInitializer(e){this._$Ei(),(this.l??=[]).push(e)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(e,t=x){if(t.state&&(t.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(e)&&((t=Object.create(t)).wrapped=!0),this.elementProperties.set(e,t),!t.noAccessor){const i=Symbol(),o=this.getPropertyDescriptor(e,i,t);void 0!==o&&c(this.prototype,e,o)}}static getPropertyDescriptor(e,t,i){const{get:o,set:s}=d(this.prototype,e)??{get(){return this[t]},set(e){this[t]=e}};return{get:o,set(t){const n=o?.call(this);s?.call(this,t),this.requestUpdate(e,n,i)},configurable:!0,enumerable:!0}}static getPropertyOptions(e){return this.elementProperties.get(e)??x}static _$Ei(){if(this.hasOwnProperty(m("elementProperties")))return;const e=_(this);e.finalize(),void 0!==e.l&&(this.l=[...e.l]),this.elementProperties=new Map(e.elementProperties)}static finalize(){if(this.hasOwnProperty(m("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(m("properties"))){const e=this.properties,t=[...h(e),...p(e)];for(const i of t)this.createProperty(i,e[i])}const e=this[Symbol.metadata];if(null!==e){const t=litPropertyMetadata.get(e);if(void 0!==t)for(const[e,i]of t)this.elementProperties.set(e,i)}this._$Eh=new Map;for(const[e,t]of this.elementProperties){const i=this._$Eu(e,t);void 0!==i&&this._$Eh.set(i,e)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(e){const t=[];if(Array.isArray(e)){const i=new Set(e.flat(1/0).reverse());for(const e of i)t.unshift(a(e))}else void 0!==e&&t.push(a(e));return t}static _$Eu(e,t){const i=t.attribute;return!1===i?void 0:"string"==typeof i?i:"string"==typeof e?e.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(e=>this.enableUpdating=e),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(e=>e(this))}addController(e){(this._$EO??=new Set).add(e),void 0!==this.renderRoot&&this.isConnected&&e.hostConnected?.()}removeController(e){this._$EO?.delete(e)}_$E_(){const e=new Map,t=this.constructor.elementProperties;for(const i of t.keys())this.hasOwnProperty(i)&&(e.set(i,this[i]),delete this[i]);e.size>0&&(this._$Ep=e)}createRenderRoot(){const e=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return((e,o)=>{if(i)e.adoptedStyleSheets=o.map(e=>e instanceof CSSStyleSheet?e:e.styleSheet);else for(const i of o){const o=document.createElement("style"),s=t.litNonce;void 0!==s&&o.setAttribute("nonce",s),o.textContent=i.cssText,e.appendChild(o)}})(e,this.constructor.elementStyles),e}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(e=>e.hostConnected?.())}enableUpdating(e){}disconnectedCallback(){this._$EO?.forEach(e=>e.hostDisconnected?.())}attributeChangedCallback(e,t,i){this._$AK(e,i)}_$ET(e,t){const i=this.constructor.elementProperties.get(e),o=this.constructor._$Eu(e,i);if(void 0!==o&&!0===i.reflect){const s=(void 0!==i.converter?.toAttribute?i.converter:y).toAttribute(t,i.type);this._$Em=e,null==s?this.removeAttribute(o):this.setAttribute(o,s),this._$Em=null}}_$AK(e,t){const i=this.constructor,o=i._$Eh.get(e);if(void 0!==o&&this._$Em!==o){const e=i.getPropertyOptions(o),s="function"==typeof e.converter?{fromAttribute:e.converter}:void 0!==e.converter?.fromAttribute?e.converter:y;this._$Em=o;const n=s.fromAttribute(t,e.type);this[o]=n??this._$Ej?.get(o)??n,this._$Em=null}}requestUpdate(e,t,i,o=!1,s){if(void 0!==e){const n=this.constructor;if(!1===o&&(s=this[e]),i??=n.getPropertyOptions(e),!((i.hasChanged??b)(s,t)||i.useDefault&&i.reflect&&s===this._$Ej?.get(e)&&!this.hasAttribute(n._$Eu(e,i))))return;this.C(e,t,i)}!1===this.isUpdatePending&&(this._$ES=this._$EP())}C(e,t,{useDefault:i,reflect:o,wrapped:s},n){i&&!(this._$Ej??=new Map).has(e)&&(this._$Ej.set(e,n??t??this[e]),!0!==s||void 0!==n)||(this._$AL.has(e)||(this.hasUpdated||i||(t=void 0),this._$AL.set(e,t)),!0===o&&this._$Em!==e&&(this._$Eq??=new Set).add(e))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(e){Promise.reject(e)}const e=this.scheduleUpdate();return null!=e&&await e,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(const[e,t]of this._$Ep)this[e]=t;this._$Ep=void 0}const e=this.constructor.elementProperties;if(e.size>0)for(const[t,i]of e){const{wrapped:e}=i,o=this[t];!0!==e||this._$AL.has(t)||void 0===o||this.C(t,void 0,i,o)}}let e=!1;const t=this._$AL;try{e=this.shouldUpdate(t),e?(this.willUpdate(t),this._$EO?.forEach(e=>e.hostUpdate?.()),this.update(t)):this._$EM()}catch(t){throw e=!1,this._$EM(),t}e&&this._$AE(t)}willUpdate(e){}_$AE(e){this._$EO?.forEach(e=>e.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(e)),this.updated(e)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(e){return!0}update(e){this._$Eq&&=this._$Eq.forEach(e=>this._$ET(e,this[e])),this._$EM()}updated(e){}firstUpdated(e){}};$.elementStyles=[],$.shadowRootOptions={mode:"open"},$[m("elementProperties")]=new Map,$[m("finalized")]=new Map,v?.({ReactiveElement:$}),(g.reactiveElementVersions??=[]).push("2.1.2");const w=globalThis,k=e=>e,S=w.trustedTypes,z=S?S.createPolicy("lit-html",{createHTML:e=>e}):void 0,A="$lit$",C=`lit$${Math.random().toFixed(9).slice(2)}$`,P="?"+C,E=`<${P}>`,M=document,F=()=>M.createComment(""),D=e=>null===e||"object"!=typeof e&&"function"!=typeof e,L=Array.isArray,T="[ \t\n\f\r]",R=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,O=/-->/g,H=/>/g,U=RegExp(`>|${T}(?:([^\\s"'>=/]+)(${T}*=${T}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,"g"),B=/'/g,I=/"/g,Z=/^(?:script|style|textarea|title)$/i,j=(e=>(t,...i)=>({_$litType$:e,strings:t,values:i}))(1),N=Symbol.for("lit-noChange"),V=Symbol.for("lit-nothing"),q=new WeakMap,W=M.createTreeWalker(M,129);function K(e,t){if(!L(e)||!e.hasOwnProperty("raw"))throw Error("invalid template strings array");return void 0!==z?z.createHTML(t):t}const X=(e,t)=>{const i=e.length-1,o=[];let s,n=2===t?"<svg>":3===t?"<math>":"",r=R;for(let t=0;t<i;t++){const i=e[t];let a,l,c=-1,d=0;for(;d<i.length&&(r.lastIndex=d,l=r.exec(i),null!==l);)d=r.lastIndex,r===R?"!--"===l[1]?r=O:void 0!==l[1]?r=H:void 0!==l[2]?(Z.test(l[2])&&(s=RegExp("</"+l[2],"g")),r=U):void 0!==l[3]&&(r=U):r===U?">"===l[0]?(r=s??R,c=-1):void 0===l[1]?c=-2:(c=r.lastIndex-l[2].length,a=l[1],r=void 0===l[3]?U:'"'===l[3]?I:B):r===I||r===B?r=U:r===O||r===H?r=R:(r=U,s=void 0);const h=r===U&&e[t+1].startsWith("/>")?" ":"";n+=r===R?i+E:c>=0?(o.push(a),i.slice(0,c)+A+i.slice(c)+C+h):i+C+(-2===c?t:h)}return[K(e,n+(e[i]||"<?>")+(2===t?"</svg>":3===t?"</math>":"")),o]};class G{constructor({strings:e,_$litType$:t},i){let o;this.parts=[];let s=0,n=0;const r=e.length-1,a=this.parts,[l,c]=X(e,t);if(this.el=G.createElement(l,i),W.currentNode=this.el.content,2===t||3===t){const e=this.el.content.firstChild;e.replaceWith(...e.childNodes)}for(;null!==(o=W.nextNode())&&a.length<r;){if(1===o.nodeType){if(o.hasAttributes())for(const e of o.getAttributeNames())if(e.endsWith(A)){const t=c[n++],i=o.getAttribute(e).split(C),r=/([.?@])?(.*)/.exec(t);a.push({type:1,index:s,name:r[2],strings:i,ctor:"."===r[1]?te:"?"===r[1]?ie:"@"===r[1]?oe:ee}),o.removeAttribute(e)}else e.startsWith(C)&&(a.push({type:6,index:s}),o.removeAttribute(e));if(Z.test(o.tagName)){const e=o.textContent.split(C),t=e.length-1;if(t>0){o.textContent=S?S.emptyScript:"";for(let i=0;i<t;i++)o.append(e[i],F()),W.nextNode(),a.push({type:2,index:++s});o.append(e[t],F())}}}else if(8===o.nodeType)if(o.data===P)a.push({type:2,index:s});else{let e=-1;for(;-1!==(e=o.data.indexOf(C,e+1));)a.push({type:7,index:s}),e+=C.length-1}s++}}static createElement(e,t){const i=M.createElement("template");return i.innerHTML=e,i}}function J(e,t,i=e,o){if(t===N)return t;let s=void 0!==o?i._$Co?.[o]:i._$Cl;const n=D(t)?void 0:t._$litDirective$;return s?.constructor!==n&&(s?._$AO?.(!1),void 0===n?s=void 0:(s=new n(e),s._$AT(e,i,o)),void 0!==o?(i._$Co??=[])[o]=s:i._$Cl=s),void 0!==s&&(t=J(e,s._$AS(e,t.values),s,o)),t}class Y{constructor(e,t){this._$AV=[],this._$AN=void 0,this._$AD=e,this._$AM=t}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(e){const{el:{content:t},parts:i}=this._$AD,o=(e?.creationScope??M).importNode(t,!0);W.currentNode=o;let s=W.nextNode(),n=0,r=0,a=i[0];for(;void 0!==a;){if(n===a.index){let t;2===a.type?t=new Q(s,s.nextSibling,this,e):1===a.type?t=new a.ctor(s,a.name,a.strings,this,e):6===a.type&&(t=new se(s,this,e)),this._$AV.push(t),a=i[++r]}n!==a?.index&&(s=W.nextNode(),n++)}return W.currentNode=M,o}p(e){let t=0;for(const i of this._$AV)void 0!==i&&(void 0!==i.strings?(i._$AI(e,i,t),t+=i.strings.length-2):i._$AI(e[t])),t++}}class Q{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(e,t,i,o){this.type=2,this._$AH=V,this._$AN=void 0,this._$AA=e,this._$AB=t,this._$AM=i,this.options=o,this._$Cv=o?.isConnected??!0}get parentNode(){let e=this._$AA.parentNode;const t=this._$AM;return void 0!==t&&11===e?.nodeType&&(e=t.parentNode),e}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(e,t=this){e=J(this,e,t),D(e)?e===V||null==e||""===e?(this._$AH!==V&&this._$AR(),this._$AH=V):e!==this._$AH&&e!==N&&this._(e):void 0!==e._$litType$?this.$(e):void 0!==e.nodeType?this.T(e):(e=>L(e)||"function"==typeof e?.[Symbol.iterator])(e)?this.k(e):this._(e)}O(e){return this._$AA.parentNode.insertBefore(e,this._$AB)}T(e){this._$AH!==e&&(this._$AR(),this._$AH=this.O(e))}_(e){this._$AH!==V&&D(this._$AH)?this._$AA.nextSibling.data=e:this.T(M.createTextNode(e)),this._$AH=e}$(e){const{values:t,_$litType$:i}=e,o="number"==typeof i?this._$AC(e):(void 0===i.el&&(i.el=G.createElement(K(i.h,i.h[0]),this.options)),i);if(this._$AH?._$AD===o)this._$AH.p(t);else{const e=new Y(o,this),i=e.u(this.options);e.p(t),this.T(i),this._$AH=e}}_$AC(e){let t=q.get(e.strings);return void 0===t&&q.set(e.strings,t=new G(e)),t}k(e){L(this._$AH)||(this._$AH=[],this._$AR());const t=this._$AH;let i,o=0;for(const s of e)o===t.length?t.push(i=new Q(this.O(F()),this.O(F()),this,this.options)):i=t[o],i._$AI(s),o++;o<t.length&&(this._$AR(i&&i._$AB.nextSibling,o),t.length=o)}_$AR(e=this._$AA.nextSibling,t){for(this._$AP?.(!1,!0,t);e!==this._$AB;){const t=k(e).nextSibling;k(e).remove(),e=t}}setConnected(e){void 0===this._$AM&&(this._$Cv=e,this._$AP?.(e))}}class ee{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(e,t,i,o,s){this.type=1,this._$AH=V,this._$AN=void 0,this.element=e,this.name=t,this._$AM=o,this.options=s,i.length>2||""!==i[0]||""!==i[1]?(this._$AH=Array(i.length-1).fill(new String),this.strings=i):this._$AH=V}_$AI(e,t=this,i,o){const s=this.strings;let n=!1;if(void 0===s)e=J(this,e,t,0),n=!D(e)||e!==this._$AH&&e!==N,n&&(this._$AH=e);else{const o=e;let r,a;for(e=s[0],r=0;r<s.length-1;r++)a=J(this,o[i+r],t,r),a===N&&(a=this._$AH[r]),n||=!D(a)||a!==this._$AH[r],a===V?e=V:e!==V&&(e+=(a??"")+s[r+1]),this._$AH[r]=a}n&&!o&&this.j(e)}j(e){e===V?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,e??"")}}class te extends ee{constructor(){super(...arguments),this.type=3}j(e){this.element[this.name]=e===V?void 0:e}}class ie extends ee{constructor(){super(...arguments),this.type=4}j(e){this.element.toggleAttribute(this.name,!!e&&e!==V)}}class oe extends ee{constructor(e,t,i,o,s){super(e,t,i,o,s),this.type=5}_$AI(e,t=this){if((e=J(this,e,t,0)??V)===N)return;const i=this._$AH,o=e===V&&i!==V||e.capture!==i.capture||e.once!==i.once||e.passive!==i.passive,s=e!==V&&(i===V||o);o&&this.element.removeEventListener(this.name,this,i),s&&this.element.addEventListener(this.name,this,e),this._$AH=e}handleEvent(e){"function"==typeof this._$AH?this._$AH.call(this.options?.host??this.element,e):this._$AH.handleEvent(e)}}class se{constructor(e,t,i){this.element=e,this.type=6,this._$AN=void 0,this._$AM=t,this.options=i}get _$AU(){return this._$AM._$AU}_$AI(e){J(this,e)}}const ne=w.litHtmlPolyfillSupport;ne?.(G,Q),(w.litHtmlVersions??=[]).push("3.3.2");const re=globalThis;class ae extends ${constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){const e=super.createRenderRoot();return this.renderOptions.renderBefore??=e.firstChild,e}update(e){const t=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(e),this._$Do=((e,t,i)=>{const o=i?.renderBefore??t;let s=o._$litPart$;if(void 0===s){const e=i?.renderBefore??null;o._$litPart$=s=new Q(t.insertBefore(F(),e),e,void 0,i??{})}return s._$AI(e),s})(t,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return N}}ae._$litElement$=!0,ae.finalized=!0,re.litElementHydrateSupport?.({LitElement:ae});const le=re.litElementPolyfillSupport;le?.({LitElement:ae}),(re.litElementVersions??=[]).push("4.2.2");const ce=e=>(t,i)=>{void 0!==i?i.addInitializer(()=>{customElements.define(e,t)}):customElements.define(e,t)},de={attribute:!0,type:String,converter:y,reflect:!1,hasChanged:b},he=(e=de,t,i)=>{const{kind:o,metadata:s}=i;let n=globalThis.litPropertyMetadata.get(s);if(void 0===n&&globalThis.litPropertyMetadata.set(s,n=new Map),"setter"===o&&((e=Object.create(e)).wrapped=!0),n.set(i.name,e),"accessor"===o){const{name:o}=i;return{set(i){const s=t.get.call(this);t.set.call(this,i),this.requestUpdate(o,s,e,!0,i)},init(t){return void 0!==t&&this.C(o,void 0,e,t),t}}}if("setter"===o){const{name:o}=i;return function(i){const s=this[o];t.call(this,i),this.requestUpdate(o,s,e,!0,i)}}throw Error("Unsupported decorator location: "+o)};function pe(e){return(t,i)=>"object"==typeof i?he(e,t,i):((e,t,i)=>{const o=t.hasOwnProperty(i);return t.constructor.createProperty(i,e),o?Object.getOwnPropertyDescriptor(t,i):void 0})(e,t,i)}function _e(e){return pe({...e,state:!0,attribute:!1})}function ge(e,t){return(t,i,o)=>((e,t,i)=>(i.configurable=!0,i.enumerable=!0,Reflect.decorate&&"object"!=typeof t&&Object.defineProperty(e,t,i),i))(t,i,{get(){return(t=>t.renderRoot?.querySelector(e)??null)(this)}})}const ue={update_interval:2,history_enabled:!0,history_retention:60,history_trail_length:50,show_proxies:!0,show_zones:!0,show_zone_labels:!0,show_signal_overlay:!1,show_accuracy_indicator:!0,theme_mode:"auto",fullscreen_enabled:!0},fe=["#4FC3F7","#81C784","#FFB74D","#BA68C8","#4DB6AC","#FFD54F","#F06292","#E57373"],ve=["#4FC3F7","#81C784","#FFB74D","#E57373","#BA68C8","#4DB6AC","#FFD54F","#F06292"],me={phone:"mdi:cellphone",tablet:"mdi:tablet",watch:"mdi:watch",tag:"mdi:tag",pet:"mdi:paw",person:"mdi:account",car:"mdi:car",key:"mdi:key"},ye="1.0.0",be="ble-livemap-card",xe="ble-livemap-card-editor";function $e(e,t,i,o,s,n){const r=[],a=[];for(const i of t){const t=e.get(i.proxy_entity_id);if(!t||i.distance<=0||i.distance>50)continue;const o=t.x/100*s,l=t.y/100*n;r.push({x:o,y:l,r:i.distance});const c=1/(i.distance*i.distance+.1);a.push(c)}if(0===r.length)return null;if(1===r.length){const e=r[0];return{x:e.x/s*100,y:e.y/n*100,accuracy:Math.min(2*e.r,15),confidence:.3}}if(2===r.length){const e=a[0]+a[1],t=(r[0].x*a[0]+r[1].x*a[1])/e,i=(r[0].y*a[0]+r[1].y*a[1])/e,o=(r[0].r+r[1].r)/2;return{x:t/s*100,y:i/n*100,accuracy:Math.min(1.5*o,12),confidence:.5}}const l=function(e,t){const i=e.length,o=i-1,s=e[o].x,n=e[o].y,r=e[o].r;let a=0,l=0,c=0,d=0,h=0;for(let o=0;o<i-1;o++){const i=e[o].x,p=e[o].y,_=e[o].r,g=t[o],u=2*(s-i),f=2*(n-p),v=r*r-_*_-s*s+i*i-n*n+p*p;a+=g*u*u,l+=g*u*f,c+=g*f*f,d+=g*u*v,h+=g*f*v}const p=a*c-l*l;if(Math.abs(p)<1e-10)return function(e,t){let i=0,o=0,s=0;for(let n=0;n<e.length;n++)o+=e[n].x*t[n],s+=e[n].y*t[n],i+=t[n];return{x:o/i,y:s/i}}(e,t);const _=(c*d-l*h)/p,g=(a*h-l*d)/p;return{x:_,y:g}}(r,a);if(!l)return null;let c=0,d=0;for(let e=0;e<r.length;e++){const t=l.x-r[e].x,i=l.y-r[e].y,o=Math.sqrt(t*t+i*i);c+=Math.abs(o-r[e].r)*a[e],d+=a[e]}const h=c/d,p=Math.min(r.length/6,1),_=Math.max(0,1-h/10),g=Math.min(.3+.4*p+.3*_,1);return{x:Math.max(0,Math.min(100,l.x/s*100)),y:Math.max(0,Math.min(100,l.y/n*100)),accuracy:Math.max(.5,Math.min(2*h,10)),confidence:g}}function we(e,t,i=.3){return e?t?{x:t.x+i*(e.x-t.x),y:t.y+i*(e.y-t.y),accuracy:t.accuracy+i*(e.accuracy-t.accuracy),confidence:t.confidence+i*(e.confidence-t.confidence)}:e:t}const ke=new Map,Se=.08;function ze(e,t,i,o,s,n){const{ctx:r,width:a,height:l,dpr:c}=e;if(r.clearRect(0,0,a*c,l*c),r.save(),r.scale(c,c),!1!==s.show_zones&&o.length>0)for(const t of o)n&&t.floor_id&&t.floor_id!==n||Ae(e,t,!1!==s.show_zone_labels);if(s.show_signal_overlay&&function(e,t,i){const{ctx:o,width:s,height:n}=e,r=t.filter(e=>!i||!e.floor_id||e.floor_id===i);if(0===r.length)return;for(const e of r){const t=e.x/100*s,i=e.y/100*n,r=.3*Math.min(s,n),a=o.createRadialGradient(t,i,0,t,i,r);a.addColorStop(0,"rgba(76,175,80,0.08)"),a.addColorStop(.5,"rgba(76,175,80,0.03)"),a.addColorStop(1,"rgba(76,175,80,0)"),o.beginPath(),o.arc(t,i,r,0,2*Math.PI),o.fillStyle=a,o.fill()}}(e,i,n),s.show_proxies)for(const t of i)n&&t.floor_id&&t.floor_id!==n||Ce(e,t);for(const i of t)i.position&&(n&&i.position.floor_id&&i.position.floor_id!==n||!1!==i.config.show_trail&&i.history.length>1&&Ee(e,i,a,l));for(const i of t)i.position&&(n&&i.position.floor_id&&i.position.floor_id!==n||Pe(e,i,a,l,s));r.restore()}function Ae(e,t,i){const{ctx:o,width:s,height:n,isDark:r}=e,a=t.points;if(!a||a.length<3)return;const l=t.color||"#4FC3F7",c=t.border_color||l,d=t.opacity??.12,h=Fe(l),p=Fe(c);o.beginPath(),o.moveTo(a[0].x/100*s,a[0].y/100*n);for(let e=1;e<a.length;e++)o.lineTo(a[e].x/100*s,a[e].y/100*n);if(o.closePath(),o.fillStyle=`rgba(${h.r},${h.g},${h.b},${d})`,o.fill(),o.strokeStyle=`rgba(${p.r},${p.g},${p.b},${Math.min(3*d,.6)})`,o.lineWidth=1.5,o.setLineDash([6,3]),o.stroke(),o.setLineDash([]),i&&!1!==t.show_label&&t.name){const e=function(e){let t=0,i=0;for(const o of e)t+=o.x,i+=o.y;return{x:t/e.length,y:i/e.length}}(a),i=e.x/100*s,l=e.y/100*n;o.font='500 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',o.textAlign="center",o.textBaseline="middle";const c=o.measureText(t.name),d=5,h=i-c.width/2-d,_=l-8,g=c.width+2*d,u=16;o.fillStyle=r?"rgba(0,0,0,0.55)":"rgba(255,255,255,0.75)",Me(o,h,_,g,u,4),o.fill(),o.fillStyle=`rgba(${p.r},${p.g},${p.b},0.8)`,o.fillText(t.name,i,l)}}function Ce(e,t){const{ctx:i,width:o,height:s,isDark:n}=e,r=t.x/100*o,a=t.y/100*s;i.beginPath(),i.arc(r,a,8,0,2*Math.PI),i.fillStyle=n?"rgba(255,255,255,0.1)":"rgba(0,0,0,0.05)",i.fill(),i.beginPath(),i.arc(r,a,6,0,2*Math.PI);const l=t.color||(n?"#546E7A":"#90A4AE");i.fillStyle=l,i.fill(),i.fillStyle="#fff",i.font="bold 6px sans-serif",i.textAlign="center",i.textBaseline="middle",i.fillText("B",r,a),t.name&&(i.font='10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',i.fillStyle=n?"rgba(255,255,255,0.5)":"rgba(0,0,0,0.4)",i.textAlign="center",i.textBaseline="top",i.fillText(t.name,r,a+6+6))}function Pe(e,t,i,o,s){const{ctx:n,isDark:r}=e,a=t.position,l=t.config.color||"#4FC3F7",c=t.device_id,d=a.x/100*i,h=a.y/100*o,p=Math.max(8,a.accuracy/20*Math.min(i,o));let _=ke.get(c);_?(_.x+=(d-_.x)*Se,_.y+=(h-_.y)*Se,_.accuracy+=(p-_.accuracy)*Se):(_={x:d,y:h,accuracy:p},ke.set(c,_));const g=_.x,u=_.y,f=_.accuracy,v=Fe(l),m=n.createRadialGradient(g,u,0,g,u,f);m.addColorStop(0,`rgba(${v.r},${v.g},${v.b},0.35)`),m.addColorStop(.5,`rgba(${v.r},${v.g},${v.b},0.15)`),m.addColorStop(1,`rgba(${v.r},${v.g},${v.b},0)`),n.beginPath(),n.arc(g,u,f,0,2*Math.PI),n.fillStyle=m,n.fill(),s.show_accuracy_indicator&&(n.beginPath(),n.arc(g,u,.7*f,0,2*Math.PI),n.strokeStyle=`rgba(${v.r},${v.g},${v.b},0.2)`,n.lineWidth=1,n.setLineDash([4,4]),n.stroke(),n.setLineDash([]));const y=Date.now()%3e3/3e3,b=10+3*Math.sin(y*Math.PI*2),x=.3+.15*Math.sin(y*Math.PI*2);if(n.beginPath(),n.arc(g,u,b,0,2*Math.PI),n.strokeStyle=`rgba(${v.r},${v.g},${v.b},${x})`,n.lineWidth=2,n.stroke(),n.beginPath(),n.arc(g,u,7,0,2*Math.PI),n.fillStyle=l,n.fill(),n.beginPath(),n.arc(g,u,3,0,2*Math.PI),n.fillStyle="#fff",n.fill(),!1!==t.config.show_label){const e=t.config.name||t.name;n.font='600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',n.textAlign="center",n.textBaseline="top";const i=n.measureText(e),o=g,s=u+14,a=4;n.fillStyle=r?"rgba(0,0,0,0.7)":"rgba(255,255,255,0.85)",Me(n,o-i.width/2-a,s-1,i.width+2*a,14,4),n.fill(),n.fillStyle=l,n.fillText(e,o,s+1)}}function Ee(e,t,i,o){const{ctx:s}=e,n=t.history,r=Fe(t.config.trail_color||t.config.color||"#4FC3F7");if(!(n.length<2)){s.lineCap="round",s.lineJoin="round";for(let e=1;e<n.length;e++){const t=e/n.length*.5,a=1+e/n.length*2,l=n[e-1].x/100*i,c=n[e-1].y/100*o,d=n[e].x/100*i,h=n[e].y/100*o;s.beginPath(),s.moveTo(l,c),s.lineTo(d,h),s.strokeStyle=`rgba(${r.r},${r.g},${r.b},${t})`,s.lineWidth=a,s.stroke()}for(let e=0;e<n.length;e++){const t=e/n.length*.4,a=1+e/n.length*1.5,l=n[e].x/100*i,c=n[e].y/100*o;s.beginPath(),s.arc(l,c,a,0,2*Math.PI),s.fillStyle=`rgba(${r.r},${r.g},${r.b},${t})`,s.fill()}}}function Me(e,t,i,o,s,n){e.beginPath(),e.moveTo(t+n,i),e.lineTo(t+o-n,i),e.quadraticCurveTo(t+o,i,t+o,i+n),e.lineTo(t+o,i+s-n),e.quadraticCurveTo(t+o,i+s,t+o-n,i+s),e.lineTo(t+n,i+s),e.quadraticCurveTo(t,i+s,t,i+s-n),e.lineTo(t,i+n),e.quadraticCurveTo(t,i,t+n,i),e.closePath()}function Fe(e){const t=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(e);return t?{r:parseInt(t[1],16),g:parseInt(t[2],16),b:parseInt(t[3],16)}:{r:79,g:195,b:247}}const De="positions";class Le{constructor(e=60,t=50){this.db=null,this.memoryCache=new Map,this.maxRetentionMs=60*e*1e3,this.maxTrailLength=t}async init(){return new Promise((e,t)=>{try{const t=indexedDB.open("ble-livemap-history",1);t.onupgradeneeded=e=>{const t=e.target.result;if(!t.objectStoreNames.contains(De)){const e=t.createObjectStore(De,{autoIncrement:!0});e.createIndex("deviceId","deviceId",{unique:!1}),e.createIndex("timestamp","timestamp",{unique:!1}),e.createIndex("deviceTimestamp",["deviceId","timestamp"],{unique:!1})}},t.onsuccess=t=>{this.db=t.target.result,this.purgeOldEntries(),e()},t.onerror=()=>{console.warn("[ble-livemap] IndexedDB not available, using memory-only history"),e()}}catch{console.warn("[ble-livemap] IndexedDB not supported, using memory-only history"),e()}})}async addPoint(e,t){this.memoryCache.has(e)||this.memoryCache.set(e,[]);const i=this.memoryCache.get(e);for(i.push(t);i.length>this.maxTrailLength;)i.shift();if(this.db)try{const i=this.db.transaction(De,"readwrite");i.objectStore(De).add({deviceId:e,...t})}catch{}}getTrail(e){return this.memoryCache.get(e)||[]}async loadHistory(e){return this.db?new Promise(t=>{try{const i=this.db.transaction(De,"readonly"),o=i.objectStore(De).index("deviceTimestamp"),s=Date.now()-this.maxRetentionMs,n=IDBKeyRange.bound([e,s],[e,1/0]),r=o.getAll(n);r.onsuccess=()=>{const i=(r.result||[]).map(e=>({x:e.x,y:e.y,timestamp:e.timestamp,floor_id:e.floor_id}));this.memoryCache.set(e,i.slice(-this.maxTrailLength)),t(i)},r.onerror=()=>{t(this.memoryCache.get(e)||[])}}catch{t(this.memoryCache.get(e)||[])}}):this.memoryCache.get(e)||[]}async purgeOldEntries(){if(this.db)try{const e=Date.now()-this.maxRetentionMs,t=this.db.transaction(De,"readwrite"),i=t.objectStore(De).index("timestamp"),o=IDBKeyRange.upperBound(e);i.openCursor(o).onsuccess=e=>{const t=e.target.result;t&&(t.delete(),t.continue())}}catch{}}updateSettings(e,t){this.maxRetentionMs=60*e*1e3,this.maxTrailLength=t}async clear(){if(this.memoryCache.clear(),this.db)try{const e=this.db.transaction(De,"readwrite");e.objectStore(De).clear()}catch{}}}const Te={en:{common:{version:"Version",no_floorplan:"No floor plan configured. Open the card editor to set up your map.",no_devices:"No tracked devices configured.",loading:"Loading...",error:"Error",unknown:"Unknown",configure:"Configure"},editor:{title:"BLE LiveMap Configuration",floorplan:"Floor Plan",floorplan_image:"Floor plan image URL",floorplan_image_help:"Use /local/filename.png for images in your www folder",floors:"Floors",floor_name:"Floor name",floor_image:"Floor plan image URL",add_floor:"Add floor",remove_floor:"Remove floor",real_dimensions:"Real dimensions",image_width:"Width (meters)",image_height:"Height (meters)",proxies:"BLE Proxies",proxy_entity:"Proxy entity",proxy_name:"Display name",proxy_position:"Position on map",add_proxy:"Add proxy",remove_proxy:"Remove proxy",place_on_map:"Click on map to place",zones:"Zones",zones_help:"Draw zones on the map to define rooms and areas. Click to add points, click near the first point to close the polygon.",zone_name:"Zone name",zone_color:"Fill color",zone_border_color:"Border color",zone_opacity:"Opacity",zone_show_label:"Show label",zone_points:"points",zone_redraw:"Redraw",zone_draw_hint:"Click on the map to draw zone corners. Click near the first point to close.",zone_finish:"Finish zone",add_zone:"Add zone",remove_zone:"Remove zone",devices:"Tracked Devices",device_entity:"Bermuda device entity prefix",device_name:"Display name",device_color:"Color",device_icon:"Icon",device_trail:"Show trail",device_label:"Show label",add_device:"Add device",remove_device:"Remove device",appearance:"Appearance",card_title:"Card title",show_proxies:"Show proxy indicators",show_zones:"Show zones",show_zone_labels:"Show zone labels",show_signal_overlay:"Show signal coverage",show_accuracy:"Show accuracy indicator",theme_mode:"Theme mode",theme_auto:"Auto (follow HA)",theme_dark:"Dark",theme_light:"Light",fullscreen:"Enable fullscreen button",history:"History & Trails",history_enabled:"Enable position history",history_retention:"History retention (minutes)",history_trail_length:"Max trail points",update_interval:"Update interval (seconds)",advanced:"Advanced"},card:{fullscreen:"Toggle fullscreen",floor_select:"Select floor",last_seen:"Last seen",accuracy:"Accuracy",confidence:"Confidence",distance:"Distance",nearest:"Nearest proxy",area:"Area",devices_tracked:"devices tracked",proxies_active:"proxies active",clear_history:"Clear history",toggle_proxies:"Toggle proxy visibility",toggle_zones:"Toggle zone visibility"}},sv:{common:{version:"Version",no_floorplan:"Ingen planritning konfigurerad. Öppna kortets editor för att konfigurera din karta.",no_devices:"Inga spårade enheter konfigurerade.",loading:"Laddar...",error:"Fel",unknown:"Okänd",configure:"Konfigurera"},editor:{title:"BLE LiveMap Konfiguration",floorplan:"Planritning",floorplan_image:"URL till planritning",floorplan_image_help:"Använd /local/filnamn.png för bilder i din www-mapp",floors:"Våningar",floor_name:"Våningsnamn",floor_image:"URL till planritning",add_floor:"Lägg till våning",remove_floor:"Ta bort våning",real_dimensions:"Verkliga mått",image_width:"Bredd (meter)",image_height:"Höjd (meter)",proxies:"BLE-proxies",proxy_entity:"Proxy-entitet",proxy_name:"Visningsnamn",proxy_position:"Position på kartan",add_proxy:"Lägg till proxy",remove_proxy:"Ta bort proxy",place_on_map:"Klicka på kartan för att placera",zones:"Zoner",zones_help:"Rita zoner på kartan för att definiera rum och områden. Klicka för att lägga till hörn, klicka nära första punkten för att stänga polygonen.",zone_name:"Zonnamn",zone_color:"Fyllnadsfärg",zone_border_color:"Kantfärg",zone_opacity:"Opacitet",zone_show_label:"Visa etikett",zone_points:"punkter",zone_redraw:"Rita om",zone_draw_hint:"Klicka på kartan för att rita zonens hörn. Klicka nära första punkten för att stänga.",zone_finish:"Slutför zon",add_zone:"Lägg till zon",remove_zone:"Ta bort zon",devices:"Spårade enheter",device_entity:"Bermuda-enhets entity prefix",device_name:"Visningsnamn",device_color:"Färg",device_icon:"Ikon",device_trail:"Visa spår",device_label:"Visa etikett",add_device:"Lägg till enhet",remove_device:"Ta bort enhet",appearance:"Utseende",card_title:"Korttitel",show_proxies:"Visa proxy-indikatorer",show_zones:"Visa zoner",show_zone_labels:"Visa zonetiketter",show_signal_overlay:"Visa signaltäckning",show_accuracy:"Visa noggrannhetsindikator",theme_mode:"Temaläge",theme_auto:"Auto (följ HA)",theme_dark:"Mörkt",theme_light:"Ljust",fullscreen:"Aktivera helskärmsknapp",history:"Historik och spår",history_enabled:"Aktivera positionshistorik",history_retention:"Historiklagring (minuter)",history_trail_length:"Max antal spårpunkter",update_interval:"Uppdateringsintervall (sekunder)",advanced:"Avancerat"},card:{fullscreen:"Växla helskärm",floor_select:"Välj våning",last_seen:"Senast sedd",accuracy:"Noggrannhet",confidence:"Konfidens",distance:"Avstånd",nearest:"Närmaste proxy",area:"Område",devices_tracked:"enheter spåras",proxies_active:"proxies aktiva",clear_history:"Rensa historik",toggle_proxies:"Visa/dölj proxies",toggle_zones:"Visa/dölj zoner"}}};function Re(e,t){const i=t&&Te[t]?t:"en",o=e.split(".");if(2!==o.length)return e;const[s,n]=o,r=Te[i];if(r&&r[s]&&r[s][n])return r[s][n];const a=Te.en;return a&&a[s]&&a[s][n]?a[s][n]:e}let Oe=class extends ae{constructor(){super(...arguments),this._activeSection="floorplan",this._placingProxy=null,this._drawingZone=null,this._drawingPoints=[],this._lang="en"}setConfig(e){this._config={...ue,...e}}_t(e){return Re(e,this._lang)}_fireConfigChanged(){const e=new CustomEvent("config-changed",{detail:{config:this._config},bubbles:!0,composed:!0});this.dispatchEvent(e)}_updateConfig(e,t){this._config={...this._config,[e]:t},this._fireConfigChanged()}_renderFloorplanSection(){const e=this._config.floors||[],t=0===e.length;return j`
      <div class="section">
        <div class="section-title">${this._t("editor.floorplan")}</div>

        ${t?j`
              <div class="field">
                <label>${this._t("editor.floorplan_image")}</label>
                <input
                  type="text"
                  .value=${this._config.floorplan_image||""}
                  @input=${e=>this._updateConfig("floorplan_image",e.target.value)}
                  placeholder="/local/floorplan.png"
                />
                <span class="help">${this._t("editor.floorplan_image_help")}</span>
              </div>
            `:V}

        <div class="field">
          <label>${this._t("editor.real_dimensions")}</label>
          <div class="field-row">
            <input
              type="number"
              .value=${String(this._getFirstFloor()?.image_width||20)}
              @input=${e=>this._updateFloorDimension("image_width",e)}
              placeholder="20"
              min="1"
              step="0.5"
            />
            <span class="unit">m</span>
            <span class="separator">x</span>
            <input
              type="number"
              .value=${String(this._getFirstFloor()?.image_height||15)}
              @input=${e=>this._updateFloorDimension("image_height",e)}
              placeholder="15"
              min="1"
              step="0.5"
            />
            <span class="unit">m</span>
          </div>
        </div>

        <div class="subsection">
          <div class="subsection-header">
            <span>${this._t("editor.floors")}</span>
            <button class="add-btn" @click=${this._addFloor}>+ ${this._t("editor.add_floor")}</button>
          </div>
          ${e.map((e,t)=>j`
              <div class="list-item">
                <div class="list-item-content">
                  <input
                    type="text"
                    .value=${e.name}
                    @input=${e=>this._updateFloor(t,"name",e.target.value)}
                    placeholder="${this._t("editor.floor_name")}"
                  />
                  <input
                    type="text"
                    .value=${e.image}
                    @input=${e=>this._updateFloor(t,"image",e.target.value)}
                    placeholder="${this._t("editor.floor_image")}"
                  />
                </div>
                <button class="remove-btn" @click=${()=>this._removeFloor(t)}>
                  <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                  </svg>
                </button>
              </div>
            `)}
        </div>
      </div>
    `}_renderProxiesSection(){const e=this._config.proxies||[],t=this._getFloorplanImage();return j`
      <div class="section">
        <div class="section-title">${this._t("editor.proxies")}</div>

        ${t?j`
              <div class="map-preview" @click=${this._handleProxyMapClick}>
                <img src=${t} alt="Floor plan" />
                ${e.map((e,t)=>j`
                    <div
                      class="proxy-marker ${this._placingProxy===t?"placing":""}"
                      style="left: ${e.x}%; top: ${e.y}%"
                      title="${e.name||e.entity_id}"
                    >
                      <span>B</span>
                    </div>
                  `)}
                ${null!==this._placingProxy?j`<div class="placing-hint">${this._t("editor.place_on_map")}</div>`:V}
              </div>
            `:V}

        ${e.map((e,t)=>j`
            <div class="list-item">
              <div class="list-item-content">
                <input
                  type="text"
                  .value=${e.entity_id}
                  @input=${e=>this._updateProxy(t,"entity_id",e.target.value)}
                  placeholder="${this._t("editor.proxy_entity")}"
                />
                <input
                  type="text"
                  .value=${e.name||""}
                  @input=${e=>this._updateProxy(t,"name",e.target.value)}
                  placeholder="${this._t("editor.proxy_name")}"
                />
                <div class="field-row">
                  <span class="label-sm">X: ${e.x.toFixed(1)}%</span>
                  <span class="label-sm">Y: ${e.y.toFixed(1)}%</span>
                  <button
                    class="place-btn ${this._placingProxy===t?"active":""}"
                    @click=${()=>this._placingProxy=this._placingProxy===t?null:t}
                  >
                    ${this._t("editor.place_on_map")}
                  </button>
                </div>
              </div>
              <button class="remove-btn" @click=${()=>this._removeProxy(t)}>
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>
          `)}

        <button class="add-btn full" @click=${this._addProxy}>+ ${this._t("editor.add_proxy")}</button>
      </div>
    `}_renderZonesSection(){const e=this._config.zones||[],t=this._getFloorplanImage();return j`
      <div class="section">
        <div class="section-title">${this._t("editor.zones")}</div>
        <p class="help">${this._t("editor.zones_help")}</p>

        ${t?j`
              <div class="map-preview zone-drawing" @click=${this._handleZoneMapClick}>
                <img src=${t} alt="Floor plan" />
                <!-- Render existing zones as SVG overlay -->
                <svg class="zone-overlay" viewBox="0 0 100 100" preserveAspectRatio="none">
                  ${e.map((e,t)=>j`
                      <polygon
                        points="${e.points.map(e=>`${e.x},${e.y}`).join(" ")}"
                        fill="${e.color||fe[t%fe.length]}"
                        fill-opacity="${e.opacity??.15}"
                        stroke="${e.border_color||e.color||fe[t%fe.length]}"
                        stroke-width="0.3"
                        stroke-dasharray="1,0.5"
                      />
                    `)}
                  <!-- Drawing in progress -->
                  ${null!==this._drawingZone&&this._drawingPoints.length>0?j`
                        <polyline
                          points="${this._drawingPoints.map(e=>`${e.x},${e.y}`).join(" ")}"
                          fill="none"
                          stroke="#E57373"
                          stroke-width="0.3"
                          stroke-dasharray="0.5,0.3"
                        />
                        ${this._drawingPoints.map(e=>j`
                            <circle cx="${e.x}" cy="${e.y}" r="0.6" fill="#E57373" />
                          `)}
                      `:V}
                </svg>
                <!-- Zone labels -->
                ${e.map((e,t)=>{const i=this._getZoneCentroid(e.points);return j`
                      <div class="zone-label" style="left: ${i.x}%; top: ${i.y}%">
                        ${e.name||`Zone ${t+1}`}
                      </div>
                    `})}
                ${null!==this._drawingZone?j`<div class="placing-hint">${this._t("editor.zone_draw_hint")}</div>`:V}
              </div>
            `:V}

        ${e.map((e,t)=>j`
            <div class="list-item">
              <div class="zone-color-dot" style="background: ${e.color||fe[t%fe.length]}"></div>
              <div class="list-item-content">
                <input
                  type="text"
                  .value=${e.name||""}
                  @input=${e=>this._updateZone(t,"name",e.target.value)}
                  placeholder="${this._t("editor.zone_name")}"
                />
                <div class="field-row">
                  <input
                    type="color"
                    .value=${e.color||fe[t%fe.length]}
                    @input=${e=>this._updateZone(t,"color",e.target.value)}
                    title="${this._t("editor.zone_color")}"
                  />
                  <input
                    type="color"
                    .value=${e.border_color||e.color||fe[t%fe.length]}
                    @input=${e=>this._updateZone(t,"border_color",e.target.value)}
                    title="${this._t("editor.zone_border_color")}"
                  />
                  <label class="checkbox">
                    <input
                      type="checkbox"
                      .checked=${!1!==e.show_label}
                      @change=${e=>this._updateZone(t,"show_label",e.target.checked)}
                    />
                    ${this._t("editor.zone_show_label")}
                  </label>
                  <span class="label-sm">${e.points.length} ${this._t("editor.zone_points")}</span>
                </div>
                <div class="field">
                  <label>${this._t("editor.zone_opacity")}</label>
                  <input
                    type="range"
                    min="0"
                    max="0.5"
                    step="0.02"
                    .value=${String(e.opacity??.12)}
                    @input=${e=>this._updateZone(t,"opacity",parseFloat(e.target.value))}
                  />
                </div>
                <div class="field-row">
                  <button
                    class="place-btn ${this._drawingZone===t?"active":""}"
                    @click=${()=>this._startDrawingZone(t)}
                  >
                    ${this._t("editor.zone_redraw")}
                  </button>
                </div>
              </div>
              <button class="remove-btn" @click=${()=>this._removeZone(t)}>
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>
          `)}

        <div class="field-row" style="gap: 8px; margin-top: 4px;">
          <button class="add-btn full" @click=${this._addZone}>+ ${this._t("editor.add_zone")}</button>
          ${null!==this._drawingZone?j`<button class="place-btn active" @click=${this._finishDrawingZone}>${this._t("editor.zone_finish")}</button>`:V}
        </div>
      </div>
    `}_renderDevicesSection(){const e=this._config.tracked_devices||[];return j`
      <div class="section">
        <div class="section-title">${this._t("editor.devices")}</div>

        ${e.map((e,t)=>j`
            <div class="list-item">
              <div class="device-color-dot" style="background: ${e.color||ve[t%ve.length]}"></div>
              <div class="list-item-content">
                <input
                  type="text"
                  .value=${e.entity_prefix||""}
                  @input=${e=>this._updateDevice(t,"entity_prefix",e.target.value)}
                  placeholder="${this._t("editor.device_entity")}"
                />
                <input
                  type="text"
                  .value=${e.name}
                  @input=${e=>this._updateDevice(t,"name",e.target.value)}
                  placeholder="${this._t("editor.device_name")}"
                />
                <div class="field-row">
                  <input
                    type="color"
                    .value=${e.color||ve[t%ve.length]}
                    @input=${e=>this._updateDevice(t,"color",e.target.value)}
                    title="${this._t("editor.device_color")}"
                  />
                  <select
                    @change=${e=>this._updateDevice(t,"icon",e.target.value)}
                  >
                    ${Object.entries(me).map(([t,i])=>j`
                        <option value=${t} ?selected=${e.icon===t}>${t}</option>
                      `)}
                  </select>
                  <label class="checkbox">
                    <input
                      type="checkbox"
                      .checked=${!1!==e.show_trail}
                      @change=${e=>this._updateDevice(t,"show_trail",e.target.checked)}
                    />
                    ${this._t("editor.device_trail")}
                  </label>
                  <label class="checkbox">
                    <input
                      type="checkbox"
                      .checked=${!1!==e.show_label}
                      @change=${e=>this._updateDevice(t,"show_label",e.target.checked)}
                    />
                    ${this._t("editor.device_label")}
                  </label>
                </div>
              </div>
              <button class="remove-btn" @click=${()=>this._removeDevice(t)}>
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>
          `)}

        <button class="add-btn full" @click=${this._addDevice}>+ ${this._t("editor.add_device")}</button>
      </div>
    `}_renderAppearanceSection(){return j`
      <div class="section">
        <div class="section-title">${this._t("editor.appearance")}</div>

        <div class="field">
          <label>${this._t("editor.card_title")}</label>
          <input
            type="text"
            .value=${this._config.card_title||""}
            @input=${e=>this._updateConfig("card_title",e.target.value)}
            placeholder="BLE LiveMap"
          />
        </div>

        <div class="field">
          <label>${this._t("editor.update_interval")}</label>
          <input
            type="number"
            .value=${String(this._config.update_interval||2)}
            @input=${e=>this._updateConfig("update_interval",Number(e.target.value))}
            min="1"
            max="30"
            step="1"
          />
        </div>

        <div class="field">
          <label>${this._t("editor.theme_mode")}</label>
          <select
            @change=${e=>this._updateConfig("theme_mode",e.target.value)}
          >
            <option value="auto" ?selected=${"auto"===this._config.theme_mode}>${this._t("editor.theme_auto")}</option>
            <option value="dark" ?selected=${"dark"===this._config.theme_mode}>${this._t("editor.theme_dark")}</option>
            <option value="light" ?selected=${"light"===this._config.theme_mode}>${this._t("editor.theme_light")}</option>
          </select>
        </div>

        <label class="checkbox">
          <input
            type="checkbox"
            .checked=${!1!==this._config.show_proxies}
            @change=${e=>this._updateConfig("show_proxies",e.target.checked)}
          />
          ${this._t("editor.show_proxies")}
        </label>

        <label class="checkbox">
          <input
            type="checkbox"
            .checked=${!1!==this._config.show_zones}
            @change=${e=>this._updateConfig("show_zones",e.target.checked)}
          />
          ${this._t("editor.show_zones")}
        </label>

        <label class="checkbox">
          <input
            type="checkbox"
            .checked=${!1!==this._config.show_zone_labels}
            @change=${e=>this._updateConfig("show_zone_labels",e.target.checked)}
          />
          ${this._t("editor.show_zone_labels")}
        </label>

        <label class="checkbox">
          <input
            type="checkbox"
            .checked=${this._config.show_signal_overlay||!1}
            @change=${e=>this._updateConfig("show_signal_overlay",e.target.checked)}
          />
          ${this._t("editor.show_signal_overlay")}
        </label>

        <label class="checkbox">
          <input
            type="checkbox"
            .checked=${!1!==this._config.show_accuracy_indicator}
            @change=${e=>this._updateConfig("show_accuracy_indicator",e.target.checked)}
          />
          ${this._t("editor.show_accuracy")}
        </label>

        <label class="checkbox">
          <input
            type="checkbox"
            .checked=${!1!==this._config.fullscreen_enabled}
            @change=${e=>this._updateConfig("fullscreen_enabled",e.target.checked)}
          />
          ${this._t("editor.fullscreen")}
        </label>
      </div>
    `}_renderHistorySection(){return j`
      <div class="section">
        <div class="section-title">${this._t("editor.history")}</div>

        <label class="checkbox">
          <input
            type="checkbox"
            .checked=${!1!==this._config.history_enabled}
            @change=${e=>this._updateConfig("history_enabled",e.target.checked)}
          />
          ${this._t("editor.history_enabled")}
        </label>

        <div class="field">
          <label>${this._t("editor.history_retention")}</label>
          <input
            type="number"
            .value=${String(this._config.history_retention||60)}
            @input=${e=>this._updateConfig("history_retention",Number(e.target.value))}
            min="5"
            max="1440"
            step="5"
          />
        </div>

        <div class="field">
          <label>${this._t("editor.history_trail_length")}</label>
          <input
            type="number"
            .value=${String(this._config.history_trail_length||50)}
            @input=${e=>this._updateConfig("history_trail_length",Number(e.target.value))}
            min="10"
            max="500"
            step="10"
          />
        </div>
      </div>
    `}_getFirstFloor(){return this._config.floors?.[0]||null}_getFloorplanImage(){const e=this._getFirstFloor();return e?.image||this._config.floorplan_image||""}_updateFloorDimension(e,t){const i=Number(t.target.value),o=[...this._config.floors||[]];o.length>0&&(o[0]={...o[0],[e]:i},this._updateConfig("floors",o))}_addFloor(){const e=[...this._config.floors||[]];e.push({id:`floor_${Date.now()}`,name:`Floor ${e.length+1}`,image:"",image_width:20,image_height:15}),this._updateConfig("floors",e)}_removeFloor(e){const t=[...this._config.floors||[]];t.splice(e,1),this._updateConfig("floors",t)}_updateFloor(e,t,i){const o=[...this._config.floors||[]];o[e]={...o[e],[t]:i},this._updateConfig("floors",o)}_addProxy(){const e=[...this._config.proxies||[]];e.push({entity_id:"",x:50,y:50,name:""}),this._updateConfig("proxies",e),this._placingProxy=e.length-1}_removeProxy(e){const t=[...this._config.proxies||[]];t.splice(e,1),this._updateConfig("proxies",t),this._placingProxy===e&&(this._placingProxy=null)}_updateProxy(e,t,i){const o=[...this._config.proxies||[]];o[e]={...o[e],[t]:i},this._updateConfig("proxies",o)}_addDevice(){const e=[...this._config.tracked_devices||[]],t=e.length;e.push({entity_prefix:"",name:`Device ${t+1}`,color:ve[t%ve.length],icon:"phone",show_trail:!0,show_label:!0}),this._updateConfig("tracked_devices",e)}_removeDevice(e){const t=[...this._config.tracked_devices||[]];t.splice(e,1),this._updateConfig("tracked_devices",t)}_updateDevice(e,t,i){const o=[...this._config.tracked_devices||[]];o[e]={...o[e],[t]:i},this._updateConfig("tracked_devices",o)}_addZone(){const e=[...this._config.zones||[]],t=e.length;e.push({id:`zone_${Date.now()}`,name:"",points:[],color:fe[t%fe.length],border_color:fe[t%fe.length],opacity:.12,show_label:!0}),this._updateConfig("zones",e),this._startDrawingZone(t)}_removeZone(e){const t=[...this._config.zones||[]];t.splice(e,1),this._updateConfig("zones",t),this._drawingZone===e&&(this._drawingZone=null,this._drawingPoints=[])}_updateZone(e,t,i){const o=[...this._config.zones||[]];o[e]={...o[e],[t]:i},this._updateConfig("zones",o)}_startDrawingZone(e){this._drawingZone=e,this._drawingPoints=[],this._placingProxy=null}_finishDrawingZone(){if(null===this._drawingZone||this._drawingPoints.length<3)return;const e=[...this._config.zones||[]];e[this._drawingZone]={...e[this._drawingZone],points:[...this._drawingPoints]},this._updateConfig("zones",e),this._drawingZone=null,this._drawingPoints=[]}_getZoneCentroid(e){if(0===e.length)return{x:50,y:50};let t=0,i=0;for(const o of e)t+=o.x,i+=o.y;return{x:t/e.length,y:i/e.length}}_handleProxyMapClick(e){if(null===this._placingProxy)return;const t=e.currentTarget.querySelector("img");if(!t)return;const i=t.getBoundingClientRect(),o=(e.clientX-i.left)/i.width*100,s=(e.clientY-i.top)/i.height*100;this._updateProxy(this._placingProxy,"x",Math.round(10*o)/10),this._updateProxy(this._placingProxy,"y",Math.round(10*s)/10),this._placingProxy=null}_handleZoneMapClick(e){if(null===this._drawingZone)return;const t=e.currentTarget.querySelector("img");if(!t)return;const i=t.getBoundingClientRect(),o=(e.clientX-i.left)/i.width*100,s=(e.clientY-i.top)/i.height*100,n={x:Math.round(10*o)/10,y:Math.round(10*s)/10};if(this._drawingPoints=[...this._drawingPoints,n],this._drawingPoints.length>=3){const e=this._drawingPoints[0];if(Math.sqrt(Math.pow(n.x-e.x,2)+Math.pow(n.y-e.y,2))<3)return this._drawingPoints=this._drawingPoints.slice(0,-1),void this._finishDrawingZone()}this.requestUpdate()}static get styles(){return r`
      :host {
        display: block;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        --editor-bg: var(--ha-card-background, #fff);
        --editor-text: var(--primary-text-color, #212121);
        --editor-text-secondary: var(--secondary-text-color, #727272);
        --editor-border: var(--divider-color, rgba(0,0,0,0.12));
        --editor-accent: var(--primary-color, #4FC3F7);
      }

      .tabs {
        display: flex;
        border-bottom: 1px solid var(--editor-border);
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
      }

      .tab {
        padding: 10px 16px;
        font-size: 12px;
        font-weight: 500;
        color: var(--editor-text-secondary);
        cursor: pointer;
        border-bottom: 2px solid transparent;
        white-space: nowrap;
        transition: color 0.2s, border-color 0.2s;
        background: none;
        border-top: none;
        border-left: none;
        border-right: none;
      }

      .tab.active {
        color: var(--editor-accent);
        border-bottom-color: var(--editor-accent);
      }

      .section {
        padding: 16px;
      }

      .section-title {
        font-size: 14px;
        font-weight: 600;
        color: var(--editor-text);
        margin-bottom: 12px;
      }

      .field {
        margin-bottom: 12px;
      }

      .field label {
        display: block;
        font-size: 12px;
        font-weight: 500;
        color: var(--editor-text-secondary);
        margin-bottom: 4px;
      }

      .field input, .field select {
        width: 100%;
        padding: 8px 10px;
        border: 1px solid var(--editor-border);
        border-radius: 8px;
        font-size: 13px;
        color: var(--editor-text);
        background: transparent;
        box-sizing: border-box;
        outline: none;
        transition: border-color 0.2s;
      }

      .field input:focus, .field select:focus {
        border-color: var(--editor-accent);
      }

      .field .help, p.help {
        display: block;
        font-size: 11px;
        color: var(--editor-text-secondary);
        margin-top: 4px;
        margin-bottom: 8px;
      }

      .field-row {
        display: flex;
        gap: 8px;
        align-items: center;
        flex-wrap: wrap;
      }

      .field-row input[type="number"] {
        flex: 1;
        min-width: 0;
      }

      .field-row .unit {
        font-size: 12px;
        color: var(--editor-text-secondary);
      }

      .field-row .separator {
        font-size: 12px;
        color: var(--editor-text-secondary);
      }

      .checkbox {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        color: var(--editor-text);
        margin-bottom: 8px;
        cursor: pointer;
      }

      .checkbox input[type="checkbox"] {
        width: 16px;
        height: 16px;
        accent-color: var(--editor-accent);
      }

      .list-item {
        display: flex;
        gap: 8px;
        align-items: flex-start;
        padding: 10px;
        border: 1px solid var(--editor-border);
        border-radius: 8px;
        margin-bottom: 8px;
      }

      .list-item-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .list-item-content input,
      .list-item-content select {
        padding: 6px 8px;
        border: 1px solid var(--editor-border);
        border-radius: 6px;
        font-size: 12px;
        color: var(--editor-text);
        background: transparent;
        outline: none;
      }

      .list-item-content input[type="range"] {
        padding: 0;
        border: none;
        accent-color: var(--editor-accent);
      }

      .device-color-dot, .zone-color-dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        margin-top: 12px;
        flex-shrink: 0;
      }

      .zone-color-dot {
        border-radius: 3px;
      }

      .label-sm {
        font-size: 11px;
        color: var(--editor-text-secondary);
      }

      .remove-btn {
        background: none;
        border: none;
        color: var(--editor-text-secondary);
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        display: flex;
        margin-top: 8px;
      }

      .remove-btn:hover {
        color: #E57373;
        background: rgba(229, 115, 115, 0.1);
      }

      .add-btn {
        background: none;
        border: 1px dashed var(--editor-border);
        border-radius: 8px;
        padding: 8px 16px;
        font-size: 12px;
        color: var(--editor-accent);
        cursor: pointer;
        transition: background 0.2s;
      }

      .add-btn:hover {
        background: rgba(79, 195, 247, 0.05);
      }

      .add-btn.full {
        width: 100%;
        margin-top: 4px;
      }

      .place-btn {
        background: var(--editor-accent);
        color: white;
        border: none;
        border-radius: 4px;
        padding: 3px 8px;
        font-size: 11px;
        cursor: pointer;
      }

      .place-btn.active {
        background: #E57373;
        animation: blink 1s ease-in-out infinite;
      }

      @keyframes blink {
        50% { opacity: 0.6; }
      }

      .subsection {
        margin-top: 16px;
      }

      .subsection-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
        font-size: 13px;
        font-weight: 500;
        color: var(--editor-text);
      }

      .map-preview {
        position: relative;
        width: 100%;
        margin-bottom: 12px;
        border-radius: 8px;
        overflow: hidden;
        cursor: crosshair;
        border: 1px solid var(--editor-border);
      }

      .map-preview img {
        width: 100%;
        display: block;
      }

      .zone-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
      }

      .zone-label {
        position: absolute;
        transform: translate(-50%, -50%);
        font-size: 10px;
        font-weight: 500;
        color: var(--editor-text);
        background: rgba(255,255,255,0.7);
        padding: 1px 6px;
        border-radius: 4px;
        pointer-events: none;
        white-space: nowrap;
      }

      .proxy-marker {
        position: absolute;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: var(--editor-accent);
        transform: translate(-50%, -50%);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 8px;
        font-weight: bold;
        color: white;
        border: 2px solid white;
        box-shadow: 0 1px 4px rgba(0,0,0,0.3);
      }

      .proxy-marker.placing {
        background: #E57373;
        animation: blink 0.5s ease-in-out infinite;
      }

      .placing-hint {
        position: absolute;
        top: 8px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0,0,0,0.7);
        color: white;
        padding: 4px 12px;
        border-radius: 12px;
        font-size: 12px;
        z-index: 10;
      }

      input[type="color"] {
        width: 32px;
        height: 28px;
        padding: 0;
        border: 1px solid var(--editor-border);
        border-radius: 4px;
        cursor: pointer;
        background: transparent;
      }
    `}render(){if(!this._config)return V;this.hass&&(this._lang=this.hass.selectedLanguage||this.hass.language||"en");const e=[{id:"floorplan",label:this._t("editor.floorplan")},{id:"proxies",label:this._t("editor.proxies")},{id:"zones",label:this._t("editor.zones")},{id:"devices",label:this._t("editor.devices")},{id:"appearance",label:this._t("editor.appearance")},{id:"history",label:this._t("editor.history")}];return j`
      <div class="tabs">
        ${e.map(e=>j`
            <button
              class="tab ${this._activeSection===e.id?"active":""}"
              @click=${()=>this._activeSection=e.id}
            >
              ${e.label}
            </button>
          `)}
      </div>

      ${"floorplan"===this._activeSection?this._renderFloorplanSection():V}
      ${"proxies"===this._activeSection?this._renderProxiesSection():V}
      ${"zones"===this._activeSection?this._renderZonesSection():V}
      ${"devices"===this._activeSection?this._renderDevicesSection():V}
      ${"appearance"===this._activeSection?this._renderAppearanceSection():V}
      ${"history"===this._activeSection?this._renderHistorySection():V}
    `}};e([pe({attribute:!1})],Oe.prototype,"hass",void 0),e([_e()],Oe.prototype,"_config",void 0),e([_e()],Oe.prototype,"_activeSection",void 0),e([_e()],Oe.prototype,"_placingProxy",void 0),e([_e()],Oe.prototype,"_drawingZone",void 0),e([_e()],Oe.prototype,"_drawingPoints",void 0),Oe=e([ce(xe)],Oe),window.customCards=window.customCards||[],window.customCards.push({type:be,name:"BLE LiveMap",description:"Real-time BLE device position tracking on your floor plan",preview:!0,documentationURL:"https://github.com/jerrypaasovaara/ha-ble-livemap"}),console.info(`%c BLE-LIVEMAP %c v${ye} `,"color: white; background: #4FC3F7; font-weight: bold; padding: 2px 6px; border-radius: 4px 0 0 4px;","color: #4FC3F7; background: #263238; font-weight: bold; padding: 2px 6px; border-radius: 0 4px 4px 0;");let He=class extends ae{constructor(){super(...arguments),this._devices=[],this._activeFloor=null,this._isFullscreen=!1,this._imageLoaded=!1,this._imageError=!1,this._showDevicePanel=!1,this._runtimeShowProxies=null,this._runtimeShowZones=null,this._runtimeShowZoneLabels=null,this._historyStore=null,this._animationFrame=null,this._updateTimer=null,this._previousPositions=new Map,this._lang="en",this._resizeObserver=null}static getConfigElement(){return document.createElement(xe)}static getStubConfig(){return{type:`custom:${be}`,floorplan_image:"",tracked_devices:[],proxies:[],...ue}}setConfig(e){if(!e)throw new Error("Invalid configuration");this._config={...ue,...e},this._config.history_enabled&&(this._historyStore=new Le(this._config.history_retention||60,this._config.history_trail_length||50),this._historyStore.init()),this._config.floors&&this._config.floors.length>0&&(this._activeFloor=this._config.active_floor||this._config.floors[0].id)}getCardSize(){return 6}connectedCallback(){super.connectedCallback(),this._startUpdateLoop(),this._setupResizeObserver()}disconnectedCallback(){super.disconnectedCallback(),this._stopUpdateLoop(),this._animationFrame&&(cancelAnimationFrame(this._animationFrame),this._animationFrame=null),this._resizeObserver&&(this._resizeObserver.disconnect(),this._resizeObserver=null)}updated(e){super.updated(e),e.has("hass")&&this.hass&&(this._lang=this.hass.selectedLanguage||this.hass.language||"en"),e.has("_imageLoaded")&&this._imageLoaded&&(this._resizeCanvas(),this._startRenderLoop())}_startUpdateLoop(){const e=1e3*(this._config?.update_interval||2);this._updateTimer=window.setInterval(()=>{this._updateDevicePositions()},e),this._updateDevicePositions()}_stopUpdateLoop(){this._updateTimer&&(clearInterval(this._updateTimer),this._updateTimer=null)}_updateDevicePositions(){if(!this.hass||!this._config)return;const e=this._config.tracked_devices||[],t=this._getAllProxies(),i=[],o=new Map;for(const e of t)o.set(e.entity_id,{x:e.x,y:e.y});const s=this._getActiveFloor(),n=s?.image_width||20,r=s?.image_height||15;for(let s=0;s<e.length;s++){const a=e[s],l=a.bermuda_device_id||a.entity_prefix||`device_${s}`,c=this._getDeviceDistances(a,t);let d=$e(o,c,0,0,n,r);const h=this._previousPositions.get(l),p=we(d?{x:d.x,y:d.y,accuracy:d.accuracy,confidence:d.confidence}:null,h?{x:h.x,y:h.y,accuracy:h.accuracy,confidence:h.confidence}:null,.25);let _=null;p&&(_={x:p.x,y:p.y,accuracy:p.accuracy,confidence:p.confidence,timestamp:Date.now(),floor_id:this._activeFloor||void 0},this._previousPositions.set(l,_),this._historyStore&&this._config.history_enabled&&this._historyStore.addPoint(l,{x:_.x,y:_.y,timestamp:_.timestamp,floor_id:_.floor_id}));const g=this._findEntity(a,"area"),u=g?this.hass.states[g]?.state:null,f=this._findEntity(a,"nearest"),v=f?this.hass.states[f]?.state:null,m=this._historyStore?this._historyStore.getTrail(l):[];i.push({device_id:l,name:a.name||`Device ${s+1}`,position:_,history:m,distances:c,nearest_proxy:v,area:u,last_seen:_?.timestamp||0,config:{...a,color:a.color||ve[s%ve.length]}})}this._devices=i,function(e){const t=new Set(e);for(const e of ke.keys())t.has(e)||ke.delete(e)}(i.map(e=>e.device_id))}_getDeviceDistances(e,t){const i=[];if(!this.hass)return i;const o=e.entity_prefix||"";for(const e of t){const t=e.entity_id.replace(/^sensor\./,"").replace(/_[^_]+$/,"");for(const[s,n]of Object.entries(this.hass.states)){if(!s.startsWith("sensor.bermuda_"))continue;if(!s.includes("distance"))continue;const r=n.attributes||{};if(o&&s.includes(o.replace("sensor.bermuda_",""))&&(r.scanner_name?.includes(e.name||"")||r.scanner_entity_id===e.entity_id||s.includes(t))){const t=parseFloat(n.state);if(!isNaN(t)&&t>0){i.push({proxy_entity_id:e.entity_id,distance:t,rssi:r.rssi||-80,timestamp:new Date(n.last_updated).getTime()});break}}}}if(0===i.length&&o){const e=`${o}_distance`,s=this.hass.states[e];if(s){const e=s.attributes||{};if(e.scanners)for(const[o,s]of Object.entries(e.scanners)){const e=t.find(e=>e.entity_id===o||e.name===s?.name);e&&s?.distance&&i.push({proxy_entity_id:e.entity_id,distance:s.distance,rssi:s.rssi||-80,timestamp:Date.now()})}}}if(0===i.length&&o){const e=o.replace("sensor.bermuda_","device_tracker.bermuda_"),s=this.hass.states[e];if(s?.attributes?.scanners)for(const[e,o]of Object.entries(s.attributes.scanners)){const s=t.find(t=>t.entity_id===e);s&&o?.distance&&i.push({proxy_entity_id:s.entity_id,distance:o.distance,rssi:o.rssi||-80,timestamp:Date.now()})}}return i}_findEntity(e,t){if(!this.hass||!e.entity_prefix)return null;const i=`${e.entity_prefix}_${t}`;return this.hass.states[i]?i:null}_getAllProxies(){if(!this._config)return[];const e=this._getActiveFloor(),t=e?.proxies||[];return[...this._config.proxies||[],...t]}_getActiveFloor(){return this._config?.floors&&(this._config.floors.find(e=>e.id===this._activeFloor)||this._config.floors[0])||null}_getFloorplanImage(){const e=this._getActiveFloor();return e?.image||this._config?.floorplan_image||""}_setupResizeObserver(){this._resizeObserver=new ResizeObserver(()=>{this._resizeCanvas()});const e=this.shadowRoot?.querySelector(".map-container");e&&this._resizeObserver.observe(e)}_resizeCanvas(){const e=this._canvas,t=this._image;if(!e||!t)return;const i=e.parentElement;if(!i)return;const o=i.clientWidth,s=o,n=o/(t.naturalWidth/t.naturalHeight),r=window.devicePixelRatio||1;e.width=s*r,e.height=n*r,e.style.width=`${s}px`,e.style.height=`${n}px`}_startRenderLoop(){const e=()=>{this._renderCanvas(),this._animationFrame=requestAnimationFrame(e)};this._animationFrame=requestAnimationFrame(e)}_renderCanvas(){const e=this._canvas;if(!e)return;const t=e.getContext("2d");if(!t)return;const i=window.devicePixelRatio||1,o=e.width/i,s=e.height/i,n=this._isDarkMode(),r={...this._config,show_proxies:this._runtimeShowProxies??this._config.show_proxies,show_zones:this._runtimeShowZones??this._config.show_zones,show_zone_labels:this._runtimeShowZoneLabels??this._config.show_zone_labels},a=this._config.zones||[];ze({ctx:t,width:o,height:s,dpr:i,isDark:n},this._devices,this._getAllProxies(),a,r,this._activeFloor)}_isDarkMode(){return"dark"===this._config?.theme_mode||"light"!==this._config?.theme_mode&&(this.hass?.themes?.darkMode??!1)}_handleImageLoad(){this._imageLoaded=!0,this._imageError=!1}_handleImageError(){this._imageError=!0,this._imageLoaded=!1}_handleFloorChange(e){const t=e.target;this._activeFloor=t.value}_toggleFullscreen(){this._isFullscreen=!this._isFullscreen,this._isFullscreen?this.requestFullscreen?.():document.exitFullscreen?.()}_toggleDevicePanel(){this._showDevicePanel=!this._showDevicePanel}_toggleProxies(){const e=this._runtimeShowProxies??this._config.show_proxies??!0;this._runtimeShowProxies=!e}_toggleZones(){const e=this._runtimeShowZones??this._config.show_zones??!0;this._runtimeShowZones=!e}_toggleZoneLabels(){const e=this._runtimeShowZoneLabels??this._config.show_zone_labels??!0;this._runtimeShowZoneLabels=!e}static get styles(){return r`
      :host {
        display: block;
        --card-bg: var(--ha-card-background, var(--card-background-color, #fff));
        --card-radius: var(--ha-card-border-radius, 12px);
        --text-primary: var(--primary-text-color, #212121);
        --text-secondary: var(--secondary-text-color, #727272);
        --accent: var(--primary-color, #4FC3F7);
      }

      ha-card {
        overflow: hidden;
        border-radius: var(--card-radius);
      }

      .card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px 4px;
      }

      .card-title {
        font-size: 16px;
        font-weight: 600;
        color: var(--text-primary);
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .card-title .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #4CAF50;
        animation: pulse-dot 2s ease-in-out infinite;
      }

      @keyframes pulse-dot {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.5; transform: scale(0.8); }
      }

      .header-actions {
        display: flex;
        gap: 4px;
        align-items: center;
      }

      .header-btn {
        background: none;
        border: none;
        color: var(--text-secondary);
        cursor: pointer;
        padding: 6px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s, color 0.2s;
      }

      .header-btn:hover {
        background: var(--divider-color, rgba(0,0,0,0.05));
        color: var(--text-primary);
      }

      .header-btn.off {
        opacity: 0.35;
      }

      .header-btn.off:hover {
        opacity: 0.6;
      }

      .header-btn svg {
        width: 18px;
        height: 18px;
      }

      .floor-select {
        background: var(--divider-color, rgba(0,0,0,0.05));
        border: none;
        border-radius: 8px;
        padding: 4px 8px;
        font-size: 12px;
        color: var(--text-primary);
        cursor: pointer;
        outline: none;
      }

      .map-container {
        position: relative;
        width: 100%;
        overflow: hidden;
        background: var(--divider-color, rgba(0,0,0,0.03));
      }

      .map-container img {
        width: 100%;
        display: block;
        opacity: 0.85;
      }

      .map-container canvas {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        pointer-events: none;
      }

      .status-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 16px 12px;
        font-size: 11px;
        color: var(--text-secondary);
      }

      .status-left {
        display: flex;
        gap: 12px;
        align-items: center;
      }

      .status-item {
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .status-item .count {
        font-weight: 600;
        color: var(--text-primary);
      }

      .device-panel {
        border-top: 1px solid var(--divider-color, rgba(0,0,0,0.08));
        max-height: 200px;
        overflow-y: auto;
        transition: max-height 0.3s ease;
      }

      .device-panel.collapsed {
        max-height: 0;
        border-top: none;
      }

      .device-item {
        display: flex;
        align-items: center;
        padding: 8px 16px;
        gap: 10px;
        transition: background 0.15s;
      }

      .device-item:hover {
        background: var(--divider-color, rgba(0,0,0,0.03));
      }

      .device-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        flex-shrink: 0;
      }

      .device-info {
        flex: 1;
        min-width: 0;
      }

      .device-name {
        font-size: 13px;
        font-weight: 500;
        color: var(--text-primary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .device-detail {
        font-size: 11px;
        color: var(--text-secondary);
      }

      .device-accuracy {
        font-size: 11px;
        color: var(--text-secondary);
        text-align: right;
        flex-shrink: 0;
      }

      .empty-state {
        padding: 40px 20px;
        text-align: center;
        color: var(--text-secondary);
      }

      .empty-state svg {
        width: 48px;
        height: 48px;
        margin-bottom: 12px;
        opacity: 0.3;
      }

      .empty-state p {
        margin: 4px 0;
        font-size: 13px;
      }

      :host([fullscreen]) ha-card {
        height: 100vh;
        border-radius: 0;
      }

      :host([fullscreen]) .map-container {
        flex: 1;
      }
    `}render(){if(!this._config)return V;const e=this._getFloorplanImage(),t=this._config.floors||[],i=t.length>1,o=this._config.card_title||"BLE LiveMap",s=e=>Re(e,this._lang);return j`
      <ha-card>
        <!-- Header -->
        <div class="card-header">
          <div class="card-title">
            <span class="dot"></span>
            ${o}
          </div>
          <div class="header-actions">
            ${i?j`
                  <select class="floor-select" @change=${this._handleFloorChange}>
                    ${t.map(e=>j`
                        <option value=${e.id} ?selected=${e.id===this._activeFloor}>
                          ${e.name}
                        </option>
                      `)}
                  </select>
                `:V}
            <!-- Toggle proxies -->
            <button
              class="header-btn ${this._runtimeShowProxies??this._config.show_proxies??1?"":"off"}"
              @click=${this._toggleProxies}
              title="${s("card.toggle_proxies")}"
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.71 7.71L12 2h-1v7.59L6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 11 14.41V22h1l5.71-5.71-4.3-4.29 4.3-4.29zM13 5.83l1.88 1.88L13 9.59V5.83zm1.88 10.46L13 18.17v-3.76l1.88 1.88z"/>
              </svg>
            </button>
            <!-- Toggle zones -->
            ${(this._config.zones?.length||0)>0?j`
                  <button
                    class="header-btn ${this._runtimeShowZones??this._config.show_zones??1?"":"off"}"
                    @click=${this._toggleZones}
                    title="${s("card.toggle_zones")}"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z"/>
                    </svg>
                  </button>
                `:V}
            <button class="header-btn" @click=${this._toggleDevicePanel} title="Devices">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            </button>
            ${this._config.fullscreen_enabled?j`
                  <button class="header-btn" @click=${this._toggleFullscreen} title="${s("card.fullscreen")}">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
                    </svg>
                  </button>
                `:V}
          </div>
        </div>

        <!-- Map -->
        ${e?j`
              <div class="map-container">
                <img
                  id="floorplan-img"
                  src=${e}
                  @load=${this._handleImageLoad}
                  @error=${this._handleImageError}
                  alt="Floor plan"
                  crossorigin="anonymous"
                />
                ${this._imageLoaded?j`<canvas id="livemap-canvas"></canvas>`:V}
                ${this._imageError?j`<div class="empty-state"><p>Failed to load floor plan image</p></div>`:V}
              </div>
            `:j`
              <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zM5 15h14v3H5z"/>
                </svg>
                <p>${s("common.no_floorplan")}</p>
              </div>
            `}

        <!-- Device Panel -->
        <div class="device-panel ${this._showDevicePanel?"":"collapsed"}">
          ${this._devices.map(e=>j`
              <div class="device-item">
                <div class="device-dot" style="background: ${e.config.color}"></div>
                <div class="device-info">
                  <div class="device-name">${e.name}</div>
                  <div class="device-detail">
                    ${e.area||e.nearest_proxy||s("common.unknown")}
                  </div>
                </div>
                <div class="device-accuracy">
                  ${e.position?j`
                        <div>${e.position.accuracy.toFixed(1)}m</div>
                        <div>${Math.round(100*e.position.confidence)}%</div>
                      `:j`<div>--</div>`}
                </div>
              </div>
            `)}
        </div>

        <!-- Status Bar -->
        <div class="status-bar">
          <div class="status-left">
            <div class="status-item">
              <span class="count">${this._devices.filter(e=>e.position).length}</span>
              ${s("card.devices_tracked")}
            </div>
            <div class="status-item">
              <span class="count">${this._getAllProxies().length}</span>
              ${s("card.proxies_active")}
            </div>
          </div>
          <div>v${ye}</div>
        </div>
      </ha-card>
    `}};e([pe({attribute:!1})],He.prototype,"hass",void 0),e([_e()],He.prototype,"_config",void 0),e([_e()],He.prototype,"_devices",void 0),e([_e()],He.prototype,"_activeFloor",void 0),e([_e()],He.prototype,"_isFullscreen",void 0),e([_e()],He.prototype,"_imageLoaded",void 0),e([_e()],He.prototype,"_imageError",void 0),e([_e()],He.prototype,"_showDevicePanel",void 0),e([_e()],He.prototype,"_runtimeShowProxies",void 0),e([_e()],He.prototype,"_runtimeShowZones",void 0),e([_e()],He.prototype,"_runtimeShowZoneLabels",void 0),e([ge("#livemap-canvas")],He.prototype,"_canvas",void 0),e([ge("#floorplan-img")],He.prototype,"_image",void 0),He=e([ce(be)],He);export{He as BLELivemapCard};
