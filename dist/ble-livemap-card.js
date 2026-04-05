function e(e,t,i,o){var a,n=arguments.length,s=n<3?t:null===o?o=Object.getOwnPropertyDescriptor(t,i):o;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)s=Reflect.decorate(e,t,i,o);else for(var r=e.length-1;r>=0;r--)(a=e[r])&&(s=(n<3?a(s):n>3?a(t,i,s):a(t,i))||s);return n>3&&s&&Object.defineProperty(t,i,s),s}"function"==typeof SuppressedError&&SuppressedError;const t=globalThis,i=t.ShadowRoot&&(void 0===t.ShadyCSS||t.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,o=Symbol(),a=new WeakMap;let n=class{constructor(e,t,i){if(this._$cssResult$=!0,i!==o)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=e,this.t=t}get styleSheet(){let e=this.o;const t=this.t;if(i&&void 0===e){const i=void 0!==t&&1===t.length;i&&(e=a.get(t)),void 0===e&&((this.o=e=new CSSStyleSheet).replaceSync(this.cssText),i&&a.set(t,e))}return e}toString(){return this.cssText}};const s=(e,...t)=>{const i=1===e.length?e[0]:t.reduce((t,i,o)=>t+(e=>{if(!0===e._$cssResult$)return e.cssText;if("number"==typeof e)return e;throw Error("Value passed to 'css' function must be a 'css' function result: "+e+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(i)+e[o+1],e[0]);return new n(i,e,o)},r=i?e=>e:e=>e instanceof CSSStyleSheet?(e=>{let t="";for(const i of e.cssRules)t+=i.cssText;return(e=>new n("string"==typeof e?e:e+"",void 0,o))(t)})(e):e,{is:l,defineProperty:c,getOwnPropertyDescriptor:d,getOwnPropertyNames:p,getOwnPropertySymbols:h,getPrototypeOf:_}=Object,g=globalThis,u=g.trustedTypes,v=u?u.emptyScript:"",f=g.reactiveElementPolyfillSupport,b=(e,t)=>e,m={toAttribute(e,t){switch(t){case Boolean:e=e?v:null;break;case Object:case Array:e=null==e?e:JSON.stringify(e)}return e},fromAttribute(e,t){let i=e;switch(t){case Boolean:i=null!==e;break;case Number:i=null===e?null:Number(e);break;case Object:case Array:try{i=JSON.parse(e)}catch(e){i=null}}return i}},y=(e,t)=>!l(e,t),x={attribute:!0,type:String,converter:m,reflect:!1,useDefault:!1,hasChanged:y};Symbol.metadata??=Symbol("metadata"),g.litPropertyMetadata??=new WeakMap;let $=class extends HTMLElement{static addInitializer(e){this._$Ei(),(this.l??=[]).push(e)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(e,t=x){if(t.state&&(t.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(e)&&((t=Object.create(t)).wrapped=!0),this.elementProperties.set(e,t),!t.noAccessor){const i=Symbol(),o=this.getPropertyDescriptor(e,i,t);void 0!==o&&c(this.prototype,e,o)}}static getPropertyDescriptor(e,t,i){const{get:o,set:a}=d(this.prototype,e)??{get(){return this[t]},set(e){this[t]=e}};return{get:o,set(t){const n=o?.call(this);a?.call(this,t),this.requestUpdate(e,n,i)},configurable:!0,enumerable:!0}}static getPropertyOptions(e){return this.elementProperties.get(e)??x}static _$Ei(){if(this.hasOwnProperty(b("elementProperties")))return;const e=_(this);e.finalize(),void 0!==e.l&&(this.l=[...e.l]),this.elementProperties=new Map(e.elementProperties)}static finalize(){if(this.hasOwnProperty(b("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(b("properties"))){const e=this.properties,t=[...p(e),...h(e)];for(const i of t)this.createProperty(i,e[i])}const e=this[Symbol.metadata];if(null!==e){const t=litPropertyMetadata.get(e);if(void 0!==t)for(const[e,i]of t)this.elementProperties.set(e,i)}this._$Eh=new Map;for(const[e,t]of this.elementProperties){const i=this._$Eu(e,t);void 0!==i&&this._$Eh.set(i,e)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(e){const t=[];if(Array.isArray(e)){const i=new Set(e.flat(1/0).reverse());for(const e of i)t.unshift(r(e))}else void 0!==e&&t.push(r(e));return t}static _$Eu(e,t){const i=t.attribute;return!1===i?void 0:"string"==typeof i?i:"string"==typeof e?e.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(e=>this.enableUpdating=e),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(e=>e(this))}addController(e){(this._$EO??=new Set).add(e),void 0!==this.renderRoot&&this.isConnected&&e.hostConnected?.()}removeController(e){this._$EO?.delete(e)}_$E_(){const e=new Map,t=this.constructor.elementProperties;for(const i of t.keys())this.hasOwnProperty(i)&&(e.set(i,this[i]),delete this[i]);e.size>0&&(this._$Ep=e)}createRenderRoot(){const e=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return((e,o)=>{if(i)e.adoptedStyleSheets=o.map(e=>e instanceof CSSStyleSheet?e:e.styleSheet);else for(const i of o){const o=document.createElement("style"),a=t.litNonce;void 0!==a&&o.setAttribute("nonce",a),o.textContent=i.cssText,e.appendChild(o)}})(e,this.constructor.elementStyles),e}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(e=>e.hostConnected?.())}enableUpdating(e){}disconnectedCallback(){this._$EO?.forEach(e=>e.hostDisconnected?.())}attributeChangedCallback(e,t,i){this._$AK(e,i)}_$ET(e,t){const i=this.constructor.elementProperties.get(e),o=this.constructor._$Eu(e,i);if(void 0!==o&&!0===i.reflect){const a=(void 0!==i.converter?.toAttribute?i.converter:m).toAttribute(t,i.type);this._$Em=e,null==a?this.removeAttribute(o):this.setAttribute(o,a),this._$Em=null}}_$AK(e,t){const i=this.constructor,o=i._$Eh.get(e);if(void 0!==o&&this._$Em!==o){const e=i.getPropertyOptions(o),a="function"==typeof e.converter?{fromAttribute:e.converter}:void 0!==e.converter?.fromAttribute?e.converter:m;this._$Em=o;const n=a.fromAttribute(t,e.type);this[o]=n??this._$Ej?.get(o)??n,this._$Em=null}}requestUpdate(e,t,i,o=!1,a){if(void 0!==e){const n=this.constructor;if(!1===o&&(a=this[e]),i??=n.getPropertyOptions(e),!((i.hasChanged??y)(a,t)||i.useDefault&&i.reflect&&a===this._$Ej?.get(e)&&!this.hasAttribute(n._$Eu(e,i))))return;this.C(e,t,i)}!1===this.isUpdatePending&&(this._$ES=this._$EP())}C(e,t,{useDefault:i,reflect:o,wrapped:a},n){i&&!(this._$Ej??=new Map).has(e)&&(this._$Ej.set(e,n??t??this[e]),!0!==a||void 0!==n)||(this._$AL.has(e)||(this.hasUpdated||i||(t=void 0),this._$AL.set(e,t)),!0===o&&this._$Em!==e&&(this._$Eq??=new Set).add(e))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(e){Promise.reject(e)}const e=this.scheduleUpdate();return null!=e&&await e,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(const[e,t]of this._$Ep)this[e]=t;this._$Ep=void 0}const e=this.constructor.elementProperties;if(e.size>0)for(const[t,i]of e){const{wrapped:e}=i,o=this[t];!0!==e||this._$AL.has(t)||void 0===o||this.C(t,void 0,i,o)}}let e=!1;const t=this._$AL;try{e=this.shouldUpdate(t),e?(this.willUpdate(t),this._$EO?.forEach(e=>e.hostUpdate?.()),this.update(t)):this._$EM()}catch(t){throw e=!1,this._$EM(),t}e&&this._$AE(t)}willUpdate(e){}_$AE(e){this._$EO?.forEach(e=>e.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(e)),this.updated(e)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(e){return!0}update(e){this._$Eq&&=this._$Eq.forEach(e=>this._$ET(e,this[e])),this._$EM()}updated(e){}firstUpdated(e){}};$.elementStyles=[],$.shadowRootOptions={mode:"open"},$[b("elementProperties")]=new Map,$[b("finalized")]=new Map,f?.({ReactiveElement:$}),(g.reactiveElementVersions??=[]).push("2.1.2");const w=globalThis,k=e=>e,z=w.trustedTypes,P=z?z.createPolicy("lit-html",{createHTML:e=>e}):void 0,C="$lit$",M=`lit$${Math.random().toFixed(9).slice(2)}$`,S="?"+M,F=`<${S}>`,A=document,E=()=>A.createComment(""),D=e=>null===e||"object"!=typeof e&&"function"!=typeof e,L=Array.isArray,T="[ \t\n\f\r]",I=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,R=/-->/g,Z=/>/g,B=RegExp(`>|${T}(?:([^\\s"'>=/]+)(${T}*=${T}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,"g"),U=/'/g,H=/"/g,O=/^(?:script|style|textarea|title)$/i,j=(e=>(t,...i)=>({_$litType$:e,strings:t,values:i}))(1),V=Symbol.for("lit-noChange"),N=Symbol.for("lit-nothing"),q=new WeakMap,W=A.createTreeWalker(A,129);function K(e,t){if(!L(e)||!e.hasOwnProperty("raw"))throw Error("invalid template strings array");return void 0!==P?P.createHTML(t):t}const Y=(e,t)=>{const i=e.length-1,o=[];let a,n=2===t?"<svg>":3===t?"<math>":"",s=I;for(let t=0;t<i;t++){const i=e[t];let r,l,c=-1,d=0;for(;d<i.length&&(s.lastIndex=d,l=s.exec(i),null!==l);)d=s.lastIndex,s===I?"!--"===l[1]?s=R:void 0!==l[1]?s=Z:void 0!==l[2]?(O.test(l[2])&&(a=RegExp("</"+l[2],"g")),s=B):void 0!==l[3]&&(s=B):s===B?">"===l[0]?(s=a??I,c=-1):void 0===l[1]?c=-2:(c=s.lastIndex-l[2].length,r=l[1],s=void 0===l[3]?B:'"'===l[3]?H:U):s===H||s===U?s=B:s===R||s===Z?s=I:(s=B,a=void 0);const p=s===B&&e[t+1].startsWith("/>")?" ":"";n+=s===I?i+F:c>=0?(o.push(r),i.slice(0,c)+C+i.slice(c)+M+p):i+M+(-2===c?t:p)}return[K(e,n+(e[i]||"<?>")+(2===t?"</svg>":3===t?"</math>":"")),o]};class J{constructor({strings:e,_$litType$:t},i){let o;this.parts=[];let a=0,n=0;const s=e.length-1,r=this.parts,[l,c]=Y(e,t);if(this.el=J.createElement(l,i),W.currentNode=this.el.content,2===t||3===t){const e=this.el.content.firstChild;e.replaceWith(...e.childNodes)}for(;null!==(o=W.nextNode())&&r.length<s;){if(1===o.nodeType){if(o.hasAttributes())for(const e of o.getAttributeNames())if(e.endsWith(C)){const t=c[n++],i=o.getAttribute(e).split(M),s=/([.?@])?(.*)/.exec(t);r.push({type:1,index:a,name:s[2],strings:i,ctor:"."===s[1]?te:"?"===s[1]?ie:"@"===s[1]?oe:ee}),o.removeAttribute(e)}else e.startsWith(M)&&(r.push({type:6,index:a}),o.removeAttribute(e));if(O.test(o.tagName)){const e=o.textContent.split(M),t=e.length-1;if(t>0){o.textContent=z?z.emptyScript:"";for(let i=0;i<t;i++)o.append(e[i],E()),W.nextNode(),r.push({type:2,index:++a});o.append(e[t],E())}}}else if(8===o.nodeType)if(o.data===S)r.push({type:2,index:a});else{let e=-1;for(;-1!==(e=o.data.indexOf(M,e+1));)r.push({type:7,index:a}),e+=M.length-1}a++}}static createElement(e,t){const i=A.createElement("template");return i.innerHTML=e,i}}function X(e,t,i=e,o){if(t===V)return t;let a=void 0!==o?i._$Co?.[o]:i._$Cl;const n=D(t)?void 0:t._$litDirective$;return a?.constructor!==n&&(a?._$AO?.(!1),void 0===n?a=void 0:(a=new n(e),a._$AT(e,i,o)),void 0!==o?(i._$Co??=[])[o]=a:i._$Cl=a),void 0!==a&&(t=X(e,a._$AS(e,t.values),a,o)),t}class G{constructor(e,t){this._$AV=[],this._$AN=void 0,this._$AD=e,this._$AM=t}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(e){const{el:{content:t},parts:i}=this._$AD,o=(e?.creationScope??A).importNode(t,!0);W.currentNode=o;let a=W.nextNode(),n=0,s=0,r=i[0];for(;void 0!==r;){if(n===r.index){let t;2===r.type?t=new Q(a,a.nextSibling,this,e):1===r.type?t=new r.ctor(a,r.name,r.strings,this,e):6===r.type&&(t=new ae(a,this,e)),this._$AV.push(t),r=i[++s]}n!==r?.index&&(a=W.nextNode(),n++)}return W.currentNode=A,o}p(e){let t=0;for(const i of this._$AV)void 0!==i&&(void 0!==i.strings?(i._$AI(e,i,t),t+=i.strings.length-2):i._$AI(e[t])),t++}}class Q{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(e,t,i,o){this.type=2,this._$AH=N,this._$AN=void 0,this._$AA=e,this._$AB=t,this._$AM=i,this.options=o,this._$Cv=o?.isConnected??!0}get parentNode(){let e=this._$AA.parentNode;const t=this._$AM;return void 0!==t&&11===e?.nodeType&&(e=t.parentNode),e}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(e,t=this){e=X(this,e,t),D(e)?e===N||null==e||""===e?(this._$AH!==N&&this._$AR(),this._$AH=N):e!==this._$AH&&e!==V&&this._(e):void 0!==e._$litType$?this.$(e):void 0!==e.nodeType?this.T(e):(e=>L(e)||"function"==typeof e?.[Symbol.iterator])(e)?this.k(e):this._(e)}O(e){return this._$AA.parentNode.insertBefore(e,this._$AB)}T(e){this._$AH!==e&&(this._$AR(),this._$AH=this.O(e))}_(e){this._$AH!==N&&D(this._$AH)?this._$AA.nextSibling.data=e:this.T(A.createTextNode(e)),this._$AH=e}$(e){const{values:t,_$litType$:i}=e,o="number"==typeof i?this._$AC(e):(void 0===i.el&&(i.el=J.createElement(K(i.h,i.h[0]),this.options)),i);if(this._$AH?._$AD===o)this._$AH.p(t);else{const e=new G(o,this),i=e.u(this.options);e.p(t),this.T(i),this._$AH=e}}_$AC(e){let t=q.get(e.strings);return void 0===t&&q.set(e.strings,t=new J(e)),t}k(e){L(this._$AH)||(this._$AH=[],this._$AR());const t=this._$AH;let i,o=0;for(const a of e)o===t.length?t.push(i=new Q(this.O(E()),this.O(E()),this,this.options)):i=t[o],i._$AI(a),o++;o<t.length&&(this._$AR(i&&i._$AB.nextSibling,o),t.length=o)}_$AR(e=this._$AA.nextSibling,t){for(this._$AP?.(!1,!0,t);e!==this._$AB;){const t=k(e).nextSibling;k(e).remove(),e=t}}setConnected(e){void 0===this._$AM&&(this._$Cv=e,this._$AP?.(e))}}class ee{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(e,t,i,o,a){this.type=1,this._$AH=N,this._$AN=void 0,this.element=e,this.name=t,this._$AM=o,this.options=a,i.length>2||""!==i[0]||""!==i[1]?(this._$AH=Array(i.length-1).fill(new String),this.strings=i):this._$AH=N}_$AI(e,t=this,i,o){const a=this.strings;let n=!1;if(void 0===a)e=X(this,e,t,0),n=!D(e)||e!==this._$AH&&e!==V,n&&(this._$AH=e);else{const o=e;let s,r;for(e=a[0],s=0;s<a.length-1;s++)r=X(this,o[i+s],t,s),r===V&&(r=this._$AH[s]),n||=!D(r)||r!==this._$AH[s],r===N?e=N:e!==N&&(e+=(r??"")+a[s+1]),this._$AH[s]=r}n&&!o&&this.j(e)}j(e){e===N?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,e??"")}}class te extends ee{constructor(){super(...arguments),this.type=3}j(e){this.element[this.name]=e===N?void 0:e}}class ie extends ee{constructor(){super(...arguments),this.type=4}j(e){this.element.toggleAttribute(this.name,!!e&&e!==N)}}class oe extends ee{constructor(e,t,i,o,a){super(e,t,i,o,a),this.type=5}_$AI(e,t=this){if((e=X(this,e,t,0)??N)===V)return;const i=this._$AH,o=e===N&&i!==N||e.capture!==i.capture||e.once!==i.once||e.passive!==i.passive,a=e!==N&&(i===N||o);o&&this.element.removeEventListener(this.name,this,i),a&&this.element.addEventListener(this.name,this,e),this._$AH=e}handleEvent(e){"function"==typeof this._$AH?this._$AH.call(this.options?.host??this.element,e):this._$AH.handleEvent(e)}}class ae{constructor(e,t,i){this.element=e,this.type=6,this._$AN=void 0,this._$AM=t,this.options=i}get _$AU(){return this._$AM._$AU}_$AI(e){X(this,e)}}const ne=w.litHtmlPolyfillSupport;ne?.(J,Q),(w.litHtmlVersions??=[]).push("3.3.2");const se=globalThis;class re extends ${constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){const e=super.createRenderRoot();return this.renderOptions.renderBefore??=e.firstChild,e}update(e){const t=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(e),this._$Do=((e,t,i)=>{const o=i?.renderBefore??t;let a=o._$litPart$;if(void 0===a){const e=i?.renderBefore??null;o._$litPart$=a=new Q(t.insertBefore(E(),e),e,void 0,i??{})}return a._$AI(e),a})(t,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return V}}re._$litElement$=!0,re.finalized=!0,se.litElementHydrateSupport?.({LitElement:re});const le=se.litElementPolyfillSupport;le?.({LitElement:re}),(se.litElementVersions??=[]).push("4.2.2");const ce=e=>(t,i)=>{void 0!==i?i.addInitializer(()=>{customElements.define(e,t)}):customElements.define(e,t)},de={attribute:!0,type:String,converter:m,reflect:!1,hasChanged:y},pe=(e=de,t,i)=>{const{kind:o,metadata:a}=i;let n=globalThis.litPropertyMetadata.get(a);if(void 0===n&&globalThis.litPropertyMetadata.set(a,n=new Map),"setter"===o&&((e=Object.create(e)).wrapped=!0),n.set(i.name,e),"accessor"===o){const{name:o}=i;return{set(i){const a=t.get.call(this);t.set.call(this,i),this.requestUpdate(o,a,e,!0,i)},init(t){return void 0!==t&&this.C(o,void 0,e,t),t}}}if("setter"===o){const{name:o}=i;return function(i){const a=this[o];t.call(this,i),this.requestUpdate(o,a,e,!0,i)}}throw Error("Unsupported decorator location: "+o)};function he(e){return(t,i)=>"object"==typeof i?pe(e,t,i):((e,t,i)=>{const o=t.hasOwnProperty(i);return t.constructor.createProperty(i,e),o?Object.getOwnPropertyDescriptor(t,i):void 0})(e,t,i)}function _e(e){return he({...e,state:!0,attribute:!1})}const ge={update_interval:2,history_enabled:!0,history_retention:60,history_trail_length:50,show_proxies:!0,show_zones:!0,show_zone_labels:!0,show_signal_overlay:!1,show_accuracy_indicator:!0,theme_mode:"auto",fullscreen_enabled:!0,floor_display_mode:"tabs",auto_fit:!0},ue=["#B3E5FC","#C8E6C9","#FFE0B2","#E1BEE7","#B2DFDB","#FFF9C4","#F8BBD0","#FFCCBC"],ve=["#1E88E5","#43A047","#E53935","#8E24AA","#FB8C00","#00ACC1","#F4511E","#3949AB"],fe={phone:"mdi:cellphone",tablet:"mdi:tablet",watch:"mdi:watch",tag:"mdi:tag",pet:"mdi:paw",person:"mdi:account",car:"mdi:car",key:"mdi:key"},be="1.6.0",me="ble-livemap-card",ye="ble-livemap-card-editor";function xe(e,t,i,o,a,n){const s=[],r=[];for(const i of t){const t=e.get(i.proxy_entity_id);if(!t||i.distance<=0||i.distance>50)continue;const o=t.x/100*a,l=t.y/100*n;s.push({x:o,y:l,r:i.distance});const c=1/(i.distance*i.distance+.1);r.push(c)}if(0===s.length)return null;if(1===s.length){const e=s[0];return{x:e.x/a*100,y:e.y/n*100,accuracy:Math.min(2*e.r,15),confidence:.3}}if(2===s.length){const e=r[0]+r[1],t=(s[0].x*r[0]+s[1].x*r[1])/e,i=(s[0].y*r[0]+s[1].y*r[1])/e,o=(s[0].r+s[1].r)/2;return{x:t/a*100,y:i/n*100,accuracy:Math.min(1.5*o,12),confidence:.5}}const l=function(e,t){const i=e.length,o=i-1,a=e[o].x,n=e[o].y,s=e[o].r;let r=0,l=0,c=0,d=0,p=0;for(let o=0;o<i-1;o++){const i=e[o].x,h=e[o].y,_=e[o].r,g=t[o],u=2*(a-i),v=2*(n-h),f=s*s-_*_-a*a+i*i-n*n+h*h;r+=g*u*u,l+=g*u*v,c+=g*v*v,d+=g*u*f,p+=g*v*f}const h=r*c-l*l;if(Math.abs(h)<1e-10)return function(e,t){let i=0,o=0,a=0;for(let n=0;n<e.length;n++)o+=e[n].x*t[n],a+=e[n].y*t[n],i+=t[n];return{x:o/i,y:a/i}}(e,t);const _=(c*d-l*p)/h,g=(r*p-l*d)/h;return{x:_,y:g}}(s,r);if(!l)return null;let c=0,d=0;for(let e=0;e<s.length;e++){const t=l.x-s[e].x,i=l.y-s[e].y,o=Math.sqrt(t*t+i*i);c+=Math.abs(o-s[e].r)*r[e],d+=r[e]}const p=c/d,h=Math.min(s.length/6,1),_=Math.max(0,1-p/10),g=Math.min(.3+.4*h+.3*_,1);return{x:Math.max(0,Math.min(100,l.x/a*100)),y:Math.max(0,Math.min(100,l.y/n*100)),accuracy:Math.max(.5,Math.min(2*p,10)),confidence:g}}function $e(e,t,i=.3){return e?t?{x:t.x+i*(e.x-t.x),y:t.y+i*(e.y-t.y),accuracy:t.accuracy+i*(e.accuracy-t.accuracy),confidence:t.confidence+i*(e.confidence-t.confidence)}:e:t}const we=new Map,ke=.08;function ze(e,t,i,o,a,n){const{ctx:s,width:r,height:l,dpr:c}=e;if(s.clearRect(0,0,r*c,l*c),s.save(),s.scale(c,c),!1!==a.show_zones&&o.length>0)for(const t of o)n&&t.floor_id&&t.floor_id!==n||Pe(e,t,!1!==a.show_zone_labels);if(a.show_signal_overlay&&function(e,t,i){const{ctx:o,width:a,height:n}=e,s=t.filter(e=>!i||!e.floor_id||e.floor_id===i);if(0===s.length)return;for(const e of s){const t=e.x/100*a,i=e.y/100*n,s=.3*Math.min(a,n),r=o.createRadialGradient(t,i,0,t,i,s);r.addColorStop(0,"rgba(76,175,80,0.08)"),r.addColorStop(.5,"rgba(76,175,80,0.03)"),r.addColorStop(1,"rgba(76,175,80,0)"),o.beginPath(),o.arc(t,i,s,0,2*Math.PI),o.fillStyle=r,o.fill()}}(e,i,n),a.show_proxies)for(const t of i)n&&t.floor_id&&t.floor_id!==n||Ce(e,t);for(const i of t)i.position&&(n&&i.position.floor_id&&i.position.floor_id!==n||!1!==i.config.show_trail&&i.history.length>1&&Se(e,i,r,l));for(const i of t)i.position&&(n&&i.position.floor_id&&i.position.floor_id!==n||Me(e,i,r,l,a));s.restore()}function Pe(e,t,i){const{ctx:o,width:a,height:n,isDark:s}=e,r=t.points;if(!r||r.length<3)return;const l=t.color||"#4FC3F7",c=t.border_color||l,d=t.opacity??.12,p=Ae(l),h=Ae(c);o.beginPath(),o.moveTo(r[0].x/100*a,r[0].y/100*n);for(let e=1;e<r.length;e++)o.lineTo(r[e].x/100*a,r[e].y/100*n);if(o.closePath(),o.fillStyle=`rgba(${p.r},${p.g},${p.b},${d})`,o.fill(),o.strokeStyle=`rgba(${h.r},${h.g},${h.b},${Math.min(3*d,.6)})`,o.lineWidth=1.5,o.setLineDash([6,3]),o.stroke(),o.setLineDash([]),i&&!1!==t.show_label&&t.name){const e=function(e){let t=0,i=0;for(const o of e)t+=o.x,i+=o.y;return{x:t/e.length,y:i/e.length}}(r),i=e.x/100*a,l=e.y/100*n;o.font='500 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',o.textAlign="center",o.textBaseline="middle";const c=o.measureText(t.name),d=5,p=i-c.width/2-d,_=l-8,g=c.width+2*d,u=16;o.fillStyle=s?"rgba(0,0,0,0.55)":"rgba(255,255,255,0.75)",Fe(o,p,_,g,u,4),o.fill(),o.fillStyle=`rgba(${h.r},${h.g},${h.b},0.8)`,o.fillText(t.name,i,l)}}function Ce(e,t){const{ctx:i,width:o,height:a,isDark:n}=e,s=t.x/100*o,r=t.y/100*a;i.beginPath(),i.arc(s,r,8,0,2*Math.PI),i.fillStyle=n?"rgba(255,255,255,0.1)":"rgba(0,0,0,0.05)",i.fill(),i.beginPath(),i.arc(s,r,6,0,2*Math.PI);const l=t.color||(n?"#546E7A":"#90A4AE");i.fillStyle=l,i.fill(),i.fillStyle="#fff",i.font="bold 6px sans-serif",i.textAlign="center",i.textBaseline="middle",i.fillText("B",s,r),t.name&&(i.font='10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',i.fillStyle=n?"rgba(255,255,255,0.5)":"rgba(0,0,0,0.4)",i.textAlign="center",i.textBaseline="top",i.fillText(t.name,s,r+6+6))}function Me(e,t,i,o,a){const{ctx:n,isDark:s}=e,r=t.position,l=t.config.color||"#4FC3F7",c=t.device_id,d=r.x/100*i,p=r.y/100*o,h=Math.max(8,r.accuracy/20*Math.min(i,o));let _=we.get(c);_?(_.x+=(d-_.x)*ke,_.y+=(p-_.y)*ke,_.accuracy+=(h-_.accuracy)*ke):(_={x:d,y:p,accuracy:h},we.set(c,_));const g=_.x,u=_.y,v=_.accuracy,f=Ae(l),b=n.createRadialGradient(g,u,0,g,u,v);b.addColorStop(0,`rgba(${f.r},${f.g},${f.b},0.35)`),b.addColorStop(.5,`rgba(${f.r},${f.g},${f.b},0.15)`),b.addColorStop(1,`rgba(${f.r},${f.g},${f.b},0)`),n.beginPath(),n.arc(g,u,v,0,2*Math.PI),n.fillStyle=b,n.fill(),a.show_accuracy_indicator&&(n.beginPath(),n.arc(g,u,.7*v,0,2*Math.PI),n.strokeStyle=`rgba(${f.r},${f.g},${f.b},0.2)`,n.lineWidth=1,n.setLineDash([4,4]),n.stroke(),n.setLineDash([]));const m=Date.now()%3e3/3e3,y=10+3*Math.sin(m*Math.PI*2),x=.3+.15*Math.sin(m*Math.PI*2);if(n.beginPath(),n.arc(g,u,y,0,2*Math.PI),n.strokeStyle=`rgba(${f.r},${f.g},${f.b},${x})`,n.lineWidth=2,n.stroke(),n.beginPath(),n.arc(g,u,7,0,2*Math.PI),n.fillStyle=l,n.fill(),n.beginPath(),n.arc(g,u,3,0,2*Math.PI),n.fillStyle="#fff",n.fill(),!1!==t.config.show_label){const e=t.config.name||t.name;n.font='600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',n.textAlign="center",n.textBaseline="top";const i=n.measureText(e),o=g,a=u+14,r=4;n.fillStyle=s?"rgba(0,0,0,0.7)":"rgba(255,255,255,0.85)",Fe(n,o-i.width/2-r,a-1,i.width+2*r,14,4),n.fill(),n.fillStyle=l,n.fillText(e,o,a+1)}}function Se(e,t,i,o){const{ctx:a}=e,n=t.history,s=Ae(t.config.trail_color||t.config.color||"#4FC3F7");if(!(n.length<2)){a.lineCap="round",a.lineJoin="round";for(let e=1;e<n.length;e++){const t=e/n.length*.5,r=1+e/n.length*2,l=n[e-1].x/100*i,c=n[e-1].y/100*o,d=n[e].x/100*i,p=n[e].y/100*o;a.beginPath(),a.moveTo(l,c),a.lineTo(d,p),a.strokeStyle=`rgba(${s.r},${s.g},${s.b},${t})`,a.lineWidth=r,a.stroke()}for(let e=0;e<n.length;e++){const t=e/n.length*.4,r=1+e/n.length*1.5,l=n[e].x/100*i,c=n[e].y/100*o;a.beginPath(),a.arc(l,c,r,0,2*Math.PI),a.fillStyle=`rgba(${s.r},${s.g},${s.b},${t})`,a.fill()}}}function Fe(e,t,i,o,a,n){e.beginPath(),e.moveTo(t+n,i),e.lineTo(t+o-n,i),e.quadraticCurveTo(t+o,i,t+o,i+n),e.lineTo(t+o,i+a-n),e.quadraticCurveTo(t+o,i+a,t+o-n,i+a),e.lineTo(t+n,i+a),e.quadraticCurveTo(t,i+a,t,i+a-n),e.lineTo(t,i+n),e.quadraticCurveTo(t,i,t+n,i),e.closePath()}function Ae(e){const t=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(e);return t?{r:parseInt(t[1],16),g:parseInt(t[2],16),b:parseInt(t[3],16)}:{r:79,g:195,b:247}}const Ee="positions";class De{constructor(e=60,t=50){this.db=null,this.memoryCache=new Map,this.maxRetentionMs=60*e*1e3,this.maxTrailLength=t}async init(){return new Promise((e,t)=>{try{const t=indexedDB.open("ble-livemap-history",1);t.onupgradeneeded=e=>{const t=e.target.result;if(!t.objectStoreNames.contains(Ee)){const e=t.createObjectStore(Ee,{autoIncrement:!0});e.createIndex("deviceId","deviceId",{unique:!1}),e.createIndex("timestamp","timestamp",{unique:!1}),e.createIndex("deviceTimestamp",["deviceId","timestamp"],{unique:!1})}},t.onsuccess=t=>{this.db=t.target.result,this.purgeOldEntries(),e()},t.onerror=()=>{console.warn("[ble-livemap] IndexedDB not available, using memory-only history"),e()}}catch{console.warn("[ble-livemap] IndexedDB not supported, using memory-only history"),e()}})}async addPoint(e,t){this.memoryCache.has(e)||this.memoryCache.set(e,[]);const i=this.memoryCache.get(e);for(i.push(t);i.length>this.maxTrailLength;)i.shift();if(this.db)try{const i=this.db.transaction(Ee,"readwrite");i.objectStore(Ee).add({deviceId:e,...t})}catch{}}getTrail(e){return this.memoryCache.get(e)||[]}async loadHistory(e){return this.db?new Promise(t=>{try{const i=this.db.transaction(Ee,"readonly"),o=i.objectStore(Ee).index("deviceTimestamp"),a=Date.now()-this.maxRetentionMs,n=IDBKeyRange.bound([e,a],[e,1/0]),s=o.getAll(n);s.onsuccess=()=>{const i=(s.result||[]).map(e=>({x:e.x,y:e.y,timestamp:e.timestamp,floor_id:e.floor_id}));this.memoryCache.set(e,i.slice(-this.maxTrailLength)),t(i)},s.onerror=()=>{t(this.memoryCache.get(e)||[])}}catch{t(this.memoryCache.get(e)||[])}}):this.memoryCache.get(e)||[]}async purgeOldEntries(){if(this.db)try{const e=Date.now()-this.maxRetentionMs,t=this.db.transaction(Ee,"readwrite"),i=t.objectStore(Ee).index("timestamp"),o=IDBKeyRange.upperBound(e);i.openCursor(o).onsuccess=e=>{const t=e.target.result;t&&(t.delete(),t.continue())}}catch{}}updateSettings(e,t){this.maxRetentionMs=60*e*1e3,this.maxTrailLength=t}async clear(){if(this.memoryCache.clear(),this.db)try{const e=this.db.transaction(Ee,"readwrite");e.objectStore(Ee).clear()}catch{}}}const Le={en:{common:{version:"Version",no_floorplan:"No floor plan configured. Open the card editor to set up your map.",no_devices:"No tracked devices configured.",loading:"Loading...",error:"Error",unknown:"Unknown",configure:"Configure"},editor:{title:"BLE LiveMap Configuration",floorplan:"Floor Plan",floorplan_image:"Floor plan image URL",floorplan_image_help:"Use /local/filename.png for images in your www folder",floors:"Floors",floor_name:"Floor name",floor_image:"Floor plan image URL",add_floor:"Add floor",remove_floor:"Remove floor",real_dimensions:"Real dimensions",dimensions_help:"Enter manually or use the calibration tool above to calculate automatically.",image_width:"Width (meters)",image_height:"Height (meters)",calibration:"Calibration Tool",calibration_help:"Mark a known distance on the floor plan (e.g. a door opening, a wall you have measured) and enter the real length. The tool will calculate the full dimensions automatically.",calibration_start:"Measure distance",calibration_cancel:"Cancel",calibration_reset:"Reset",calibration_click_start:"Click the START point of the known distance",calibration_click_end:"Click the END point of the known distance",calibration_distance:"Real distance between the two points",calibration_distance_placeholder:"e.g. 3.5",calibration_apply:"Apply",calibration_result:"Calculated dimensions",proxies:"BLE Proxies",proxy_entity:"Proxy entity",proxy_name:"Display name",proxy_position:"Position on map",add_proxy:"Add proxy",remove_proxy:"Remove proxy",place_on_map:"Click on map to place",drag_to_move:"Drag proxy to new position",drag_hint:"Drag to reposition, or use 'Place on map' button",no_entities_found:"No matching entities found",auto_place:"Auto-place proxies",auto_place_help:"Matches proxy names to zone names and places them at zone centers",auto_place_placed:"Placed",auto_place_no_match:"no matching zone found",auto_place_no_zones:"Define zones first, then auto-place will match proxies to zones by name",zones:"Zones",zones_help:"Draw zones on the map to define rooms and areas. Click to add points, click near the first point to close the polygon.",zone_name:"Zone name",zone_color:"Fill color",zone_border_color:"Border color",zone_opacity:"Opacity",zone_show_label:"Show label",zone_points:"points",zone_redraw:"Redraw",zone_draw_hint:"Click on the map to draw zone corners. Click near the first point to close.",zone_finish:"Finish zone",add_zone:"Add zone",remove_zone:"Remove zone",devices:"Tracked Devices",device_entity:"Bermuda device prefix",device_name:"Display name",device_color:"Color",device_icon:"Icon",device_trail:"Show trail",device_label:"Show label",add_device:"Add device",remove_device:"Remove device",discovered_devices:"Discovered Bermuda devices (click to add):",no_bermuda_devices:"No Bermuda devices found in Home Assistant",appearance:"Appearance",card_title:"Card title",show_proxies:"Show proxy indicators",show_zones:"Show zones",show_zone_labels:"Show zone labels",show_signal_overlay:"Show signal coverage",show_accuracy:"Show accuracy indicator",theme_mode:"Theme mode",theme_auto:"Auto (follow HA)",theme_dark:"Dark",theme_light:"Light",floor_display:"Floor display mode",floor_display_tabs:"Tabs (one floor at a time)",floor_display_stacked:"Stacked (all floors visible)",auto_fit:"Auto-fit map to available space",fullscreen:"Enable fullscreen button",history:"History & Trails",history_enabled:"Enable position history",history_retention:"History retention (minutes)",history_trail_length:"Max trail points",update_interval:"Update interval (seconds)",advanced:"Advanced"},card:{fullscreen:"Toggle fullscreen",floor_select:"Select floor",last_seen:"Last seen",accuracy:"Accuracy",confidence:"Confidence",distance:"Distance",nearest:"Nearest proxy",area:"Area",devices_tracked:"devices tracked",proxies_active:"proxies active",clear_history:"Clear history",toggle_proxies:"Toggle proxy visibility",toggle_zones:"Toggle zone visibility"}},sv:{common:{version:"Version",no_floorplan:"Ingen planritning konfigurerad. Öppna kortets editor för att konfigurera din karta.",no_devices:"Inga spårade enheter konfigurerade.",loading:"Laddar...",error:"Fel",unknown:"Okänd",configure:"Konfigurera"},editor:{title:"BLE LiveMap Konfiguration",floorplan:"Planritning",floorplan_image:"URL till planritning",floorplan_image_help:"Använd /local/filnamn.png för bilder i din www-mapp",floors:"Våningar",floor_name:"Våningsnamn",floor_image:"URL till planritning",add_floor:"Lägg till våning",remove_floor:"Ta bort våning",real_dimensions:"Verkliga mått",dimensions_help:"Ange manuellt eller använd kalibreringsverktyget ovan för att beräkna automatiskt.",image_width:"Bredd (meter)",image_height:"Höjd (meter)",calibration:"Kalibreringsverktyg",calibration_help:"Markera en känd sträcka på planritningen (t.ex. en dörröppning, en vägg du mätt) och ange den verkliga längden. Verktyget beräknar hela ritningens mått automatiskt.",calibration_start:"Mät sträcka",calibration_cancel:"Avbryt",calibration_reset:"Återställ",calibration_click_start:"Klicka på STARTPUNKTEN för den kända sträckan",calibration_click_end:"Klicka på SLUTPUNKTEN för den kända sträckan",calibration_distance:"Verkligt avstånd mellan de två punkterna",calibration_distance_placeholder:"t.ex. 3.5",calibration_apply:"Applicera",calibration_result:"Beräknade mått",proxies:"BLE-proxies",proxy_entity:"Proxy-entitet",proxy_name:"Visningsnamn",proxy_position:"Position på kartan",add_proxy:"Lägg till proxy",remove_proxy:"Ta bort proxy",place_on_map:"Klicka på kartan för att placera",drag_to_move:"Dra proxyn till ny position",drag_hint:"Dra för att flytta, eller använd 'Placera på kartan'-knappen",no_entities_found:"Inga matchande entiteter hittades",auto_place:"Auto-placera proxies",auto_place_help:"Matchar proxy-namn mot zon-namn och placerar dem i zonens mitt",auto_place_placed:"Placerade",auto_place_no_match:"ingen matchande zon hittades",auto_place_no_zones:"Definiera zoner först, sedan matchar auto-placering proxies mot zoner via namn",zones:"Zoner",zones_help:"Rita zoner på kartan för att definiera rum och områden. Klicka för att lägga till hörn, klicka nära första punkten för att stänga polygonen.",zone_name:"Zonnamn",zone_color:"Fyllnadsfärg",zone_border_color:"Kantfärg",zone_opacity:"Opacitet",zone_show_label:"Visa etikett",zone_points:"punkter",zone_redraw:"Rita om",zone_draw_hint:"Klicka på kartan för att rita zonens hörn. Klicka nära första punkten för att stänga.",zone_finish:"Slutför zon",add_zone:"Lägg till zon",remove_zone:"Ta bort zon",devices:"Spårade enheter",device_entity:"Bermuda-enhetsprefix",device_name:"Visningsnamn",device_color:"Färg",device_icon:"Ikon",device_trail:"Visa spår",device_label:"Visa etikett",add_device:"Lägg till enhet",remove_device:"Ta bort enhet",discovered_devices:"Upptäckta Bermuda-enheter (klicka för att lägga till):",no_bermuda_devices:"Inga Bermuda-enheter hittades i Home Assistant",appearance:"Utseende",card_title:"Korttitel",show_proxies:"Visa proxy-indikatorer",show_zones:"Visa zoner",show_zone_labels:"Visa zonetiketter",show_signal_overlay:"Visa signaltäckning",show_accuracy:"Visa noggrannhetsindikator",theme_mode:"Temaläge",theme_auto:"Auto (följ HA)",theme_dark:"Mörkt",theme_light:"Ljust",floor_display:"Våningsvisning",floor_display_tabs:"Flikar (en våning åt gången)",floor_display_stacked:"Staplade (alla våningar synliga)",auto_fit:"Anpassa kartan automatiskt till tillgängligt utrymme",fullscreen:"Aktivera helskärmsknapp",history:"Historik och spår",history_enabled:"Aktivera positionshistorik",history_retention:"Historiklagring (minuter)",history_trail_length:"Max antal spårpunkter",update_interval:"Uppdateringsintervall (sekunder)",advanced:"Avancerat"},card:{fullscreen:"Växla helskärm",floor_select:"Välj våning",last_seen:"Senast sedd",accuracy:"Noggrannhet",confidence:"Konfidens",distance:"Avstånd",nearest:"Närmaste proxy",area:"Område",devices_tracked:"enheter spåras",proxies_active:"proxies aktiva",clear_history:"Rensa historik",toggle_proxies:"Visa/dölj proxies",toggle_zones:"Visa/dölj zoner"}}};function Te(e,t){const i=t&&Le[t]?t:"en",o=e.split(".");if(2!==o.length)return e;const[a,n]=o,s=Le[i];if(s&&s[a]&&s[a][n])return s[a][n];const r=Le.en;return r&&r[a]&&r[a][n]?r[a][n]:e}let Ie=class extends re{constructor(){super(...arguments),this._activeTab="floorplan",this._placingProxy=null,this._drawingZone=null,this._drawingPoints=[],this._calibrating=!1,this._calibrationPoints=[],this._calibrationMeters=0,this._hoveredProxy=null,this._hoverPos=null,this._draggingProxy=null,this._autoPlaceResults=[],this._lang="en",this._dragStarted=!1}setConfig(e){this._config={...ge,...e}}_t(e){return Te(e,this._lang)}_fireConfigChanged(){const e=new CustomEvent("config-changed",{detail:{config:this._config},bubbles:!0,composed:!0});this.dispatchEvent(e)}_updateConfig(e,t){this._config={...this._config,[e]:t},this._fireConfigChanged()}_getAllEntities(){return this.hass?.states?Object.keys(this.hass.states).map(e=>({entity_id:e,name:this.hass.states[e]?.attributes?.friendly_name||e})).sort((e,t)=>e.entity_id.localeCompare(t.entity_id)):[]}_getBermudaEntities(){return this.hass?.states?Object.keys(this.hass.states).filter(e=>e.includes("bermuda")||e.includes("ble_proxy")||e.includes("bluetooth_proxy")||e.includes("esphome")).map(e=>({entity_id:e,name:this.hass.states[e]?.attributes?.friendly_name||e})).sort((e,t)=>e.entity_id.localeCompare(t.entity_id)):[]}_getBermudaDevicePrefixes(){if(!this.hass?.states)return[];const e=new Map;return Object.keys(this.hass.states).filter(e=>e.includes("bermuda")).forEach(t=>{const i=t.split("_"),o=i[i.length-1];if(["distance","area","rssi","power","scanner"].includes(o)){const o=i.slice(0,-1).join("_");if(!e.has(o)){const i=(this.hass.states[t]?.attributes?.friendly_name||o).replace(/ (Distance|Area|RSSI|Power|Scanner)$/i,"");e.set(o,i)}}}),Array.from(e.entries()).map(([e,t])=>({prefix:e,name:t}))}_autoPlaceProxies(){const e=[...this._config.proxies||[]],t=this._config.zones||[];if(0===t.length||0===e.length)return this._autoPlaceResults=[this._t("editor.auto_place_no_zones")],void this.requestUpdate();const i=[];let o=0;for(let a=0;a<e.length;a++){const n=e[a],s=(n.name||"").toLowerCase().trim(),r=(n.entity_id||"").toLowerCase().replace(/^.*\./,"").split("_");let l=null;for(const e of t){const t=(e.name||"").toLowerCase().trim();if(!t)continue;let i=0;if(s&&s===t)i=100;else if(s&&s.includes(t))i=80;else if(s&&t.includes(s))i=70;else if(r.some(e=>e.length>2&&t.includes(e)))i=60;else{const e=t.split(/[\s_-]+/);for(const t of e)if(t.length>2&&r.some(e=>e.includes(t)||t.includes(e))){i=50;break}}i>0&&(!l||i>l.score)&&(l={zone:e,score:i})}if(l){const t=this._getZoneCentroid(l.zone.points);e[a]={...e[a],x:t.x,y:t.y},o++,i.push(`✓ "${n.name||n.entity_id}" → "${l.zone.name}"`)}else i.push(`✗ "${n.name||n.entity_id}" — ${this._t("editor.auto_place_no_match")}`)}this._updateConfig("proxies",e),i.unshift(`${this._t("editor.auto_place_placed")} ${o}/${e.length}`),this._autoPlaceResults=i,this.requestUpdate()}_renderFloorplanTab(){const e=this._config.floors||[],t=this._getFloorplanImage(),i=2===this._calibrationPoints.length&&this._calibrationMeters>0;return j`
      <div class="tab-content">
        <h3>${this._t("editor.floorplan")}</h3>

        ${0===e.length?j`
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
            `:N}

        <!-- Calibration Tool -->
        ${t?j`
              <div class="subsection">
                <h4>${this._t("editor.calibration")}</h4>
                <p class="help">${this._t("editor.calibration_help")}</p>

                <div class="large-map" @click=${this._handleCalibrationClick}>
                  <img src=${t} alt="Floor plan" />
                  <svg class="map-overlay" viewBox="0 0 100 100" preserveAspectRatio="none">
                    ${this._calibrationPoints.length>=1?j`
                          <circle cx="${this._calibrationPoints[0].x}" cy="${this._calibrationPoints[0].y}"
                            r="0.6" fill="#FF5722" stroke="white" stroke-width="0.15" />
                        `:N}
                    ${2===this._calibrationPoints.length?j`
                          <line x1="${this._calibrationPoints[0].x}" y1="${this._calibrationPoints[0].y}"
                            x2="${this._calibrationPoints[1].x}" y2="${this._calibrationPoints[1].y}"
                            stroke="#FF5722" stroke-width="0.25" stroke-dasharray="0.8,0.4" />
                          <circle cx="${this._calibrationPoints[1].x}" cy="${this._calibrationPoints[1].y}"
                            r="0.6" fill="#FF5722" stroke="white" stroke-width="0.15" />
                        `:N}
                  </svg>
                  ${this._calibrating?j`<div class="map-hint">
                        ${0===this._calibrationPoints.length?this._t("editor.calibration_click_start"):this._t("editor.calibration_click_end")}
                      </div>`:N}
                </div>

                <div class="action-row">
                  <button class="btn ${this._calibrating?"btn-active":""}"
                    @click=${this._toggleCalibration}>
                    ${this._calibrating?this._t("editor.calibration_cancel"):this._t("editor.calibration_start")}
                  </button>
                  ${2===this._calibrationPoints.length?j`<button class="btn" @click=${this._resetCalibration}>${this._t("editor.calibration_reset")}</button>`:N}
                </div>

                ${2===this._calibrationPoints.length?j`
                      <div class="field inline">
                        <label>${this._t("editor.calibration_distance")}</label>
                        <div class="inline-group">
                          <input type="number" .value=${String(this._calibrationMeters||"")}
                            @input=${e=>{this._calibrationMeters=parseFloat(e.target.value)||0}}
                            placeholder="${this._t("editor.calibration_distance_placeholder")}" min="0.1" step="0.1" />
                          <span class="unit">m</span>
                          ${this._calibrationMeters>0?j`<button class="btn btn-primary" @click=${this._applyCalibration}>${this._t("editor.calibration_apply")}</button>`:N}
                        </div>
                      </div>
                      ${i?j`<div class="success-box">${this._t("editor.calibration_result")}: <strong>${this._getCalibrationResult()}</strong></div>`:N}
                    `:N}
              </div>
            `:N}

        <!-- Manual dimensions -->
        <div class="field inline">
          <label>${this._t("editor.real_dimensions")}</label>
          <div class="inline-group">
            <input type="number" .value=${String(this._getFirstFloor()?.image_width||20)}
              @input=${e=>this._updateFloorDimension("image_width",e)} placeholder="20" min="1" step="0.5" />
            <span class="unit">m</span>
            <span class="sep">x</span>
            <input type="number" .value=${String(this._getFirstFloor()?.image_height||15)}
              @input=${e=>this._updateFloorDimension("image_height",e)} placeholder="15" min="1" step="0.5" />
            <span class="unit">m</span>
          </div>
          <span class="help">${this._t("editor.dimensions_help")}</span>
        </div>

        <!-- Multi-floor management -->
        <div class="subsection">
          <div class="subsection-header">
            <h4>${this._t("editor.floors")}</h4>
            <button class="btn btn-add" @click=${this._addFloor}>+ ${this._t("editor.add_floor")}</button>
          </div>
          ${e.map((e,t)=>j`
              <div class="item-card">
                <div class="item-body">
                  <input type="text" .value=${e.name}
                    @input=${e=>this._updateFloor(t,"name",e.target.value)}
                    placeholder="${this._t("editor.floor_name")}" />
                  <input type="text" .value=${e.image}
                    @input=${e=>this._updateFloor(t,"image",e.target.value)}
                    placeholder="${this._t("editor.floor_image")}" />
                </div>
                <button class="btn-icon btn-remove" @click=${()=>this._removeFloor(t)}>✕</button>
              </div>
            `)}
        </div>
      </div>
    `}_renderProxiesTab(){const e=this._config.proxies||[],t=this._getFloorplanImage(),i=this._config.zones||[];return j`
      <div class="tab-content">
        <h3>${this._t("editor.proxies")}</h3>

        ${t?j`
              <div class="large-map"
                @click=${this._handleProxyMapClick}
                @mousemove=${this._handleProxyMapMouseMove}
                @mouseleave=${this._handleProxyMapMouseLeave}
                @mousedown=${this._handleProxyMapMouseDown}
                @mouseup=${this._handleProxyMapMouseUp}
              >
                <img src=${t} alt="Floor plan" draggable="false" />
                <svg class="map-overlay" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <!-- Draw zones as background reference -->
                  ${i.map((e,t)=>j`
                      <polygon
                        points="${e.points.map(e=>`${e.x},${e.y}`).join(" ")}"
                        fill="${e.color||ue[t%ue.length]}"
                        fill-opacity="0.08"
                        stroke="${e.border_color||e.color||ue[t%ue.length]}"
                        stroke-width="0.2" stroke-dasharray="0.8,0.4" />
                      ${!1!==e.show_label&&e.name?j`<text x="${this._getZoneCentroid(e.points).x}" y="${this._getZoneCentroid(e.points).y}"
                            text-anchor="middle" dominant-baseline="central" font-size="1.8"
                            fill="${e.border_color||e.color||ue[t%ue.length]}"
                            fill-opacity="0.5" font-weight="500">${e.name}</text>`:N}
                    `)}
                  <!-- Draw proxies -->
                  ${e.map((e,t)=>j`
                      <g class="${this._placingProxy===t?"pulse-marker":""} ${this._draggingProxy===t?"dragging-marker":""}">
                        <circle cx="${e.x}" cy="${e.y}" r="${this._hoveredProxy===t?1.8:1.2}"
                          fill="${e.color||"#4FC3F7"}" stroke="white" stroke-width="0.2"
                          style="cursor: ${null!==this._placingProxy?"crosshair":"grab"}; pointer-events: all; transition: r 0.15s;" />
                        <text x="${e.x}" y="${e.y}" text-anchor="middle" dominant-baseline="central"
                          font-size="1" fill="white" font-weight="700">B</text>
                        ${e.name?j`<text x="${e.x}" y="${Number(e.y)+2.5}" text-anchor="middle"
                              font-size="1.4" fill="${e.color||"#4FC3F7"}" font-weight="500"
                              fill-opacity="0.8">${e.name}</text>`:N}
                      </g>
                    `)}
                </svg>
                ${null!==this._placingProxy?j`<div class="map-hint">${this._t("editor.place_on_map")}</div>`:N}
                ${null!==this._draggingProxy?j`<div class="map-hint">${this._t("editor.drag_to_move")}</div>`:N}
                <!-- Hover tooltip -->
                ${null!==this._hoveredProxy&&this._hoverPos&&null===this._draggingProxy?this._renderProxyTooltip(e[this._hoveredProxy],this._hoveredProxy):N}
              </div>
            `:N}

        <!-- Auto-place button -->
        ${e.length>0&&i.length>0?j`
              <div class="action-row">
                <button class="btn btn-primary" @click=${this._autoPlaceProxies}>
                  ⚡ ${this._t("editor.auto_place")}
                </button>
                <span class="help" style="margin: 0; align-self: center;">${this._t("editor.auto_place_help")}</span>
              </div>
              ${this._autoPlaceResults.length>0?j`
                    <div class="auto-place-results">
                      ${this._autoPlaceResults.map(e=>j`<div class="auto-place-line">${e}</div>`)}
                    </div>
                  `:N}
            `:N}

        <div class="items-list">
          ${e.map((e,t)=>j`
              <div class="item-card ${this._hoveredProxy===t?"item-card-highlight":""}">
                <div class="item-body">
                  <div class="field">
                    <label>${this._t("editor.proxy_entity")}</label>
                    <select @change=${e=>this._updateProxy(t,"entity_id",e.target.value)}>
                      <option value="">-- Select entity --</option>
                      ${this._getAllEntities().map(t=>j`
                          <option value=${t.entity_id} ?selected=${e.entity_id===t.entity_id}>
                            ${t.name} (${t.entity_id})
                          </option>
                        `)}
                    </select>
                  </div>
                  <div class="field">
                    <label>${this._t("editor.proxy_name")}</label>
                    <input type="text" .value=${e.name||""}
                      @input=${e=>this._updateProxy(t,"name",e.target.value)}
                      placeholder="${this._t("editor.proxy_name")}" />
                  </div>
                  <div class="inline-group">
                    <span class="label-sm">X: ${e.x.toFixed(1)}%</span>
                    <span class="label-sm">Y: ${e.y.toFixed(1)}%</span>
                    <input type="color" .value=${e.color||"#4FC3F7"}
                      @input=${e=>this._updateProxy(t,"color",e.target.value)} />
                    <button class="btn ${this._placingProxy===t?"btn-active":""}"
                      @click=${()=>{this._placingProxy=this._placingProxy===t?null:t,this._draggingProxy=null}}>
                      ${this._t("editor.place_on_map")}
                    </button>
                  </div>
                </div>
                <button class="btn-icon btn-remove" @click=${()=>this._removeProxy(t)}>✕</button>
              </div>
            `)}
        </div>

        <button class="btn btn-add btn-full" @click=${this._addProxy}>+ ${this._t("editor.add_proxy")}</button>
      </div>
    `}_renderProxyTooltip(e,t){if(!this._hoverPos)return N;const i=e.entity_id?this.hass?.states?.[e.entity_id]:void 0,o=i?.attributes?.friendly_name||"",a=i?.state||"",n=i?.last_updated?new Date(i.last_updated).toLocaleTimeString():"";return j`
      <div class="proxy-tooltip" style="left: ${this._hoverPos.x}px; top: ${this._hoverPos.y}px;">
        <div class="tooltip-title">${e.name||`Proxy ${t+1}`}</div>
        <div class="tooltip-row"><span class="tooltip-label">Entity:</span> <span class="tooltip-value">${e.entity_id||"—"}</span></div>
        ${o?j`<div class="tooltip-row"><span class="tooltip-label">Name:</span> <span class="tooltip-value">${o}</span></div>`:N}
        ${a?j`<div class="tooltip-row"><span class="tooltip-label">State:</span> <span class="tooltip-value">${a}</span></div>`:N}
        <div class="tooltip-row"><span class="tooltip-label">Position:</span> <span class="tooltip-value">X: ${e.x.toFixed(1)}% Y: ${e.y.toFixed(1)}%</span></div>
        ${e.floor_id?j`<div class="tooltip-row"><span class="tooltip-label">Floor:</span> <span class="tooltip-value">${e.floor_id}</span></div>`:N}
        ${n?j`<div class="tooltip-row"><span class="tooltip-label">Updated:</span> <span class="tooltip-value">${n}</span></div>`:N}
        <div class="tooltip-hint">${this._t("editor.drag_hint")}</div>
      </div>
    `}_renderZonesTab(){const e=this._config.zones||[],t=this._getFloorplanImage();return j`
      <div class="tab-content">
        <h3>${this._t("editor.zones")}</h3>
        <p class="help">${this._t("editor.zones_help")}</p>

        ${t?j`
              <div class="large-map" @click=${this._handleZoneMapClick}>
                <img src=${t} alt="Floor plan" draggable="false" />
                <svg class="map-overlay" viewBox="0 0 100 100" preserveAspectRatio="none">
                  ${e.map((e,t)=>j`
                      <polygon
                        points="${e.points.map(e=>`${e.x},${e.y}`).join(" ")}"
                        fill="${e.color||ue[t%ue.length]}"
                        fill-opacity="${e.opacity??.15}"
                        stroke="${e.border_color||e.color||ue[t%ue.length]}"
                        stroke-width="0.3" stroke-dasharray="1,0.5" />
                      ${!1!==e.show_label?j`
                            <text x="${this._getZoneCentroid(e.points).x}" y="${this._getZoneCentroid(e.points).y}"
                              text-anchor="middle" dominant-baseline="central" font-size="2.2"
                              fill="${e.border_color||e.color||ue[t%ue.length]}"
                              font-weight="600">${e.name}</text>
                          `:N}
                    `)}
                  ${null!==this._drawingZone&&this._drawingPoints.length>0?j`
                        <polyline points="${this._drawingPoints.map(e=>`${e.x},${e.y}`).join(" ")}"
                          fill="none" stroke="#4FC3F7" stroke-width="0.3" stroke-dasharray="0.5,0.5" />
                        ${this._drawingPoints.map(e=>j`<circle cx="${e.x}" cy="${e.y}" r="0.5" fill="#4FC3F7" />`)}
                      `:N}
                </svg>
                ${null!==this._drawingZone?j`<div class="map-hint">${this._t("editor.zone_draw_hint")}</div>`:N}
              </div>
            `:N}

        <div class="items-list">
          ${e.map((e,t)=>j`
              <div class="item-card">
                <div class="color-dot" style="background: ${e.color||ue[t%ue.length]}"></div>
                <div class="item-body">
                  <input type="text" .value=${e.name}
                    @input=${e=>this._updateZone(t,"name",e.target.value)}
                    placeholder="${this._t("editor.zone_name")}" />
                  <div class="inline-group">
                    <input type="color" .value=${e.color||ue[t%ue.length]}
                      @input=${e=>this._updateZone(t,"color",e.target.value)}
                      title="${this._t("editor.zone_color")}" />
                    <input type="color" .value=${e.border_color||e.color||ue[t%ue.length]}
                      @input=${e=>this._updateZone(t,"border_color",e.target.value)}
                      title="${this._t("editor.zone_border_color")}" />
                    <span class="label-sm">${e.points.length} ${this._t("editor.zone_points")}</span>
                    <label class="check">
                      <input type="checkbox" .checked=${!1!==e.show_label}
                        @change=${e=>this._updateZone(t,"show_label",e.target.checked)} />
                      ${this._t("editor.zone_show_label")}
                    </label>
                  </div>
                  <div class="inline-group">
                    <span class="label-sm">${this._t("editor.zone_opacity")}</span>
                    <input type="range" min="0" max="0.5" step="0.02"
                      .value=${String(e.opacity??.12)}
                      @input=${e=>this._updateZone(t,"opacity",parseFloat(e.target.value))} />
                    <button class="btn ${this._drawingZone===t?"btn-active":""}"
                      @click=${()=>this._startDrawingZone(t)}>
                      ${this._t("editor.zone_redraw")}
                    </button>
                  </div>
                </div>
                <button class="btn-icon btn-remove" @click=${()=>this._removeZone(t)}>✕</button>
              </div>
            `)}
        </div>

        <div class="action-row">
          <button class="btn btn-add btn-full" @click=${this._addZone}>+ ${this._t("editor.add_zone")}</button>
          ${null!==this._drawingZone?j`<button class="btn btn-active" @click=${this._finishDrawingZone}>${this._t("editor.zone_finish")}</button>`:N}
        </div>
      </div>
    `}_renderDevicesTab(){const e=this._config.tracked_devices||[],t=this._getBermudaDevicePrefixes();return j`
      <div class="tab-content">
        <h3>${this._t("editor.devices")}</h3>

        ${t.length>0?j`
              <div class="discovery-box">
                <div class="label-sm" style="margin-bottom: 6px;">${this._t("editor.discovered_devices")}</div>
                <div class="discovery-list">
                  ${t.filter(t=>!e.some(e=>e.entity_prefix===t.prefix)).map(e=>j`
                        <button class="btn-chip" @click=${()=>this._addDeviceFromDiscovery(e.prefix,e.name)}>
                          + ${e.name}
                        </button>
                      `)}
                </div>
              </div>
            `:N}

        <div class="items-list">
          ${e.map((e,i)=>j`
              <div class="item-card">
                <div class="color-dot" style="background: ${e.color||ve[i%ve.length]}"></div>
                <div class="item-body">
                  <div class="field">
                    <label>${this._t("editor.device_entity")}</label>
                    <select @change=${o=>{const a=o.target.value;this._updateDevice(i,"entity_prefix",a);const n=t.find(e=>e.prefix===a);!n||e.name&&!e.name.startsWith("Device ")||this._updateDevice(i,"name",n.name)}}>
                      <option value="">-- Select Bermuda device --</option>
                      ${t.map(t=>j`
                          <option value=${t.prefix} ?selected=${e.entity_prefix===t.prefix}>
                            ${t.name} (${t.prefix})
                          </option>
                        `)}
                    </select>
                  </div>
                  <div class="field">
                    <label>${this._t("editor.device_name")}</label>
                    <input type="text" .value=${e.name}
                      @input=${e=>this._updateDevice(i,"name",e.target.value)}
                      placeholder="${this._t("editor.device_name")}" />
                  </div>
                  <div class="inline-group">
                    <input type="color" .value=${e.color||ve[i%ve.length]}
                      @input=${e=>this._updateDevice(i,"color",e.target.value)}
                      title="${this._t("editor.device_color")}" />
                    <select @change=${e=>this._updateDevice(i,"icon",e.target.value)}>
                      ${Object.entries(fe).map(([t,i])=>j`
                          <option value=${t} ?selected=${e.icon===t}>${t}</option>
                        `)}
                    </select>
                    <label class="check">
                      <input type="checkbox" .checked=${!1!==e.show_trail}
                        @change=${e=>this._updateDevice(i,"show_trail",e.target.checked)} />
                      ${this._t("editor.device_trail")}
                    </label>
                    <label class="check">
                      <input type="checkbox" .checked=${!1!==e.show_label}
                        @change=${e=>this._updateDevice(i,"show_label",e.target.checked)} />
                      ${this._t("editor.device_label")}
                    </label>
                  </div>
                </div>
                <button class="btn-icon btn-remove" @click=${()=>this._removeDevice(i)}>✕</button>
              </div>
            `)}
        </div>

        <button class="btn btn-add btn-full" @click=${this._addDevice}>+ ${this._t("editor.add_device")}</button>
      </div>
    `}_renderAppearanceTab(){return j`
      <div class="tab-content">
        <h3>${this._t("editor.appearance")}</h3>

        <div class="field">
          <label>${this._t("editor.card_title")}</label>
          <input type="text" .value=${this._config.card_title||""}
            @input=${e=>this._updateConfig("card_title",e.target.value)}
            placeholder="BLE LiveMap" />
        </div>

        <div class="toggles">
          <label class="check">
            <input type="checkbox" .checked=${!1!==this._config.show_proxies}
              @change=${e=>this._updateConfig("show_proxies",e.target.checked)} />
            ${this._t("editor.show_proxies")}
          </label>
          <label class="check">
            <input type="checkbox" .checked=${!1!==this._config.show_zones}
              @change=${e=>this._updateConfig("show_zones",e.target.checked)} />
            ${this._t("editor.show_zones")}
          </label>
          <label class="check">
            <input type="checkbox" .checked=${!1!==this._config.show_zone_labels}
              @change=${e=>this._updateConfig("show_zone_labels",e.target.checked)} />
            ${this._t("editor.show_zone_labels")}
          </label>
          <label class="check">
            <input type="checkbox" .checked=${this._config.show_signal_overlay||!1}
              @change=${e=>this._updateConfig("show_signal_overlay",e.target.checked)} />
            ${this._t("editor.show_signal_overlay")}
          </label>
          <label class="check">
            <input type="checkbox" .checked=${!1!==this._config.show_accuracy_indicator}
              @change=${e=>this._updateConfig("show_accuracy_indicator",e.target.checked)} />
            ${this._t("editor.show_accuracy")}
          </label>
          <label class="check">
            <input type="checkbox" .checked=${!1!==this._config.fullscreen_enabled}
              @change=${e=>this._updateConfig("fullscreen_enabled",e.target.checked)} />
            ${this._t("editor.fullscreen")}
          </label>
          <label class="check">
            <input type="checkbox" .checked=${!1!==this._config.auto_fit}
              @change=${e=>this._updateConfig("auto_fit",e.target.checked)} />
            ${this._t("editor.auto_fit")}
          </label>
        </div>

        <div class="field">
          <label>${this._t("editor.theme_mode")}</label>
          <select @change=${e=>this._updateConfig("theme_mode",e.target.value)}>
            <option value="auto" ?selected=${"auto"===this._config.theme_mode}>${this._t("editor.theme_auto")}</option>
            <option value="dark" ?selected=${"dark"===this._config.theme_mode}>${this._t("editor.theme_dark")}</option>
            <option value="light" ?selected=${"light"===this._config.theme_mode}>${this._t("editor.theme_light")}</option>
          </select>
        </div>

        <div class="field">
          <label>${this._t("editor.floor_display")}</label>
          <select @change=${e=>this._updateConfig("floor_display_mode",e.target.value)}>
            <option value="tabs" ?selected=${"tabs"===this._config.floor_display_mode}>${this._t("editor.floor_display_tabs")}</option>
            <option value="stacked" ?selected=${"stacked"===this._config.floor_display_mode}>${this._t("editor.floor_display_stacked")}</option>
          </select>
        </div>

        <h3 style="margin-top: 20px;">${this._t("editor.history")}</h3>

        <div class="toggles">
          <label class="check">
            <input type="checkbox" .checked=${!1!==this._config.history_enabled}
              @change=${e=>this._updateConfig("history_enabled",e.target.checked)} />
            ${this._t("editor.history_enabled")}
          </label>
        </div>

        <div class="field inline">
          <label>${this._t("editor.history_retention")}</label>
          <div class="inline-group">
            <input type="number" .value=${String(this._config.history_retention||60)}
              @input=${e=>this._updateConfig("history_retention",parseInt(e.target.value)||60)}
              min="5" max="1440" step="5" />
            <span class="unit">min</span>
          </div>
        </div>

        <div class="field inline">
          <label>${this._t("editor.history_trail_length")}</label>
          <div class="inline-group">
            <input type="number" .value=${String(this._config.history_trail_length||50)}
              @input=${e=>this._updateConfig("history_trail_length",parseInt(e.target.value)||50)}
              min="5" max="500" step="5" />
          </div>
        </div>

        <div class="field inline">
          <label>${this._t("editor.update_interval")}</label>
          <div class="inline-group">
            <input type="number" .value=${String(this._config.update_interval||2)}
              @input=${e=>this._updateConfig("update_interval",parseInt(e.target.value)||2)}
              min="1" max="30" step="1" />
            <span class="unit">s</span>
          </div>
        </div>
      </div>
    `}_getFirstFloor(){return this._config.floors?.[0]||null}_getFloorplanImage(){const e=this._getFirstFloor();return e?.image||this._config.floorplan_image||""}_updateFloorDimension(e,t){const i=Number(t.target.value),o=[...this._config.floors||[]];o.length>0&&(o[0]={...o[0],[e]:i},this._updateConfig("floors",o))}_addFloor(){const e=[...this._config.floors||[]];e.push({id:`floor_${Date.now()}`,name:`Floor ${e.length+1}`,image:"",image_width:20,image_height:15}),this._updateConfig("floors",e)}_removeFloor(e){const t=[...this._config.floors||[]];t.splice(e,1),this._updateConfig("floors",t)}_updateFloor(e,t,i){const o=[...this._config.floors||[]];o[e]={...o[e],[t]:i},this._updateConfig("floors",o)}_addProxy(){const e=[...this._config.proxies||[]];e.push({entity_id:"",x:50,y:50,name:""}),this._updateConfig("proxies",e),this._placingProxy=e.length-1}_removeProxy(e){const t=[...this._config.proxies||[]];t.splice(e,1),this._updateConfig("proxies",t),this._placingProxy===e&&(this._placingProxy=null),this._hoveredProxy===e&&(this._hoveredProxy=null),this._draggingProxy===e&&(this._draggingProxy=null)}_updateProxy(e,t,i){const o=[...this._config.proxies||[]];o[e]={...o[e],[t]:i},this._updateConfig("proxies",o)}_addDevice(){const e=[...this._config.tracked_devices||[]],t=e.length;e.push({entity_prefix:"",name:`Device ${t+1}`,color:ve[t%ve.length],icon:"phone",show_trail:!0,show_label:!0}),this._updateConfig("tracked_devices",e)}_addDeviceFromDiscovery(e,t){const i=[...this._config.tracked_devices||[]],o=i.length;i.push({entity_prefix:e,name:t,color:ve[o%ve.length],icon:"phone",show_trail:!0,show_label:!0}),this._updateConfig("tracked_devices",i)}_removeDevice(e){const t=[...this._config.tracked_devices||[]];t.splice(e,1),this._updateConfig("tracked_devices",t)}_updateDevice(e,t,i){const o=[...this._config.tracked_devices||[]];o[e]={...o[e],[t]:i},this._updateConfig("tracked_devices",o)}_addZone(){const e=[...this._config.zones||[]],t=e.length;e.push({id:`zone_${Date.now()}`,name:"",points:[],color:ue[t%ue.length],border_color:ue[t%ue.length],opacity:.12,show_label:!0}),this._updateConfig("zones",e),this._startDrawingZone(t)}_removeZone(e){const t=[...this._config.zones||[]];t.splice(e,1),this._updateConfig("zones",t),this._drawingZone===e&&(this._drawingZone=null,this._drawingPoints=[])}_updateZone(e,t,i){const o=[...this._config.zones||[]];o[e]={...o[e],[t]:i},this._updateConfig("zones",o)}_startDrawingZone(e){this._drawingZone=e,this._drawingPoints=[],this._placingProxy=null}_finishDrawingZone(){if(null===this._drawingZone||this._drawingPoints.length<3)return;const e=[...this._config.zones||[]];e[this._drawingZone]={...e[this._drawingZone],points:[...this._drawingPoints]},this._updateConfig("zones",e),this._drawingZone=null,this._drawingPoints=[]}_getZoneCentroid(e){if(0===e.length)return{x:50,y:50};let t=0,i=0;for(const o of e)t+=o.x,i+=o.y;return{x:t/e.length,y:i/e.length}}_toggleCalibration(){this._calibrating?(this._calibrating=!1,this._calibrationPoints=[]):(this._calibrating=!0,this._calibrationPoints=[],this._calibrationMeters=0,this._placingProxy=null,this._drawingZone=null)}_resetCalibration(){this._calibrating=!1,this._calibrationPoints=[],this._calibrationMeters=0}_handleCalibrationClick(e){if(!this._calibrating)return;if(this._calibrationPoints.length>=2)return;const t=this._getMapCoords(e);t&&(this._calibrationPoints=[...this._calibrationPoints,t],2===this._calibrationPoints.length&&(this._calibrating=!1),this.requestUpdate())}_applyCalibration(){if(2!==this._calibrationPoints.length||this._calibrationMeters<=0)return;const e=this._calibrationPoints[0],t=this._calibrationPoints[1],i=t.x-e.x,o=t.y-e.y;if(Math.sqrt(i*i+o*o)<.5)return;const a=this.shadowRoot?.querySelector(".large-map img");if(!a||!a.naturalWidth||!a.naturalHeight)return;const n=a.naturalWidth/a.naturalHeight,s=i/100*n,r=o/100,l=Math.sqrt(s*s+r*r),c=this._calibrationMeters/l,d=c*n,p=Math.round(10*d)/10,h=Math.round(10*c)/10,_=[...this._config.floors||[]];_.length>0?(_[0]={..._[0],image_width:p,image_height:h},this._updateConfig("floors",_)):(this._config={...this._config,floors:[{id:"floor_main",name:"Main",image:this._config.floorplan_image||"",image_width:p,image_height:h}]},this._fireConfigChanged())}_getCalibrationResult(){if(2!==this._calibrationPoints.length||this._calibrationMeters<=0)return"";const e=this.shadowRoot?.querySelector(".large-map img");if(!e||!e.naturalWidth||!e.naturalHeight)return"";const t=this._calibrationPoints[0],i=this._calibrationPoints[1],o=i.x-t.x,a=i.y-t.y,n=e.naturalWidth/e.naturalHeight,s=o/100*n,r=a/100,l=Math.sqrt(s*s+r*r),c=this._calibrationMeters/l,d=c*n;return`${Math.round(10*d)/10}m x ${Math.round(10*c)/10}m`}_getMapCoords(e){const t=e.currentTarget.querySelector("img");if(!t)return null;const i=t.getBoundingClientRect(),o=(e.clientX-i.left)/i.width*100,a=(e.clientY-i.top)/i.height*100;return{x:Math.round(10*o)/10,y:Math.round(10*a)/10}}_getMapPixelCoords(e){const t=e.currentTarget.getBoundingClientRect();return{x:e.clientX-t.left,y:e.clientY-t.top}}_findProxyAtCoords(e){const t=this._config.proxies||[];for(let i=t.length-1;i>=0;i--){const o=t[i],a=o.x-e.x,n=o.y-e.y;if(Math.sqrt(a*a+n*n)<3)return i}return null}_handleProxyMapClick(e){if(this._dragStarted)return void(this._dragStarted=!1);if(null===this._placingProxy)return;const t=this._getMapCoords(e);t&&(this._updateProxy(this._placingProxy,"x",t.x),this._updateProxy(this._placingProxy,"y",t.y),this._placingProxy=null)}_handleProxyMapMouseMove(e){const t=this._getMapCoords(e),i=this._getMapPixelCoords(e);if(!t||!i)return;if(null!==this._draggingProxy){this._dragStarted=!0;const e=[...this._config.proxies||[]];return e[this._draggingProxy]={...e[this._draggingProxy],x:Math.max(0,Math.min(100,t.x)),y:Math.max(0,Math.min(100,t.y))},this._config={...this._config,proxies:e},this._fireConfigChanged(),void this.requestUpdate()}if(null!==this._placingProxy)return;const o=this._findProxyAtCoords(t);o!==this._hoveredProxy&&(this._hoveredProxy=o),this._hoverPos=null!==o?{x:i.x+15,y:i.y-10}:null,this.requestUpdate()}_handleProxyMapMouseLeave(){this._hoveredProxy=null,this._hoverPos=null,null!==this._draggingProxy&&(this._draggingProxy=null,this._dragStarted=!1),this.requestUpdate()}_handleProxyMapMouseDown(e){if(null!==this._placingProxy)return;const t=this._getMapCoords(e);if(!t)return;const i=this._findProxyAtCoords(t);null!==i&&(this._draggingProxy=i,this._dragStarted=!1,e.preventDefault())}_handleProxyMapMouseUp(){null!==this._draggingProxy&&(this._draggingProxy=null)}_handleZoneMapClick(e){if(null===this._drawingZone)return;const t=this._getMapCoords(e);if(t){if(this._drawingPoints=[...this._drawingPoints,t],this._drawingPoints.length>=3){const e=this._drawingPoints[0];if(Math.sqrt(Math.pow(t.x-e.x,2)+Math.pow(t.y-e.y,2))<3)return this._drawingPoints=this._drawingPoints.slice(0,-1),void this._finishDrawingZone()}this.requestUpdate()}}static get styles(){return s`
      :host {
        display: block;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        --ed-bg: var(--ha-card-background, #fff);
        --ed-text: var(--primary-text-color, #212121);
        --ed-text2: var(--secondary-text-color, #727272);
        --ed-border: var(--divider-color, rgba(0,0,0,0.12));
        --ed-accent: var(--primary-color, #4FC3F7);
        --ed-success: #4CAF50;
      }

      h3 { font-size: 15px; font-weight: 600; color: var(--ed-text); margin: 0 0 12px 0; }
      h4 { font-size: 13px; font-weight: 600; color: var(--ed-text); margin: 0; }

      .tabs {
        display: flex;
        border-bottom: 2px solid var(--ed-border);
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        position: sticky;
        top: 0;
        background: var(--ed-bg);
        z-index: 10;
      }

      .tab {
        padding: 10px 14px;
        font-size: 12px;
        font-weight: 500;
        color: var(--ed-text2);
        cursor: pointer;
        border: none;
        border-bottom: 2px solid transparent;
        background: none;
        white-space: nowrap;
        transition: color 0.2s, border-color 0.2s;
        margin-bottom: -2px;
      }

      .tab.active { color: var(--ed-accent); border-bottom-color: var(--ed-accent); }
      .tab-content { padding: 16px; }

      .field { margin-bottom: 12px; }
      .field label { display: block; font-size: 12px; font-weight: 500; color: var(--ed-text2); margin-bottom: 4px; }

      .field input[type="text"],
      .field input[type="number"],
      .field select {
        width: 100%; padding: 8px 10px; border: 1px solid var(--ed-border); border-radius: 8px;
        font-size: 13px; color: var(--ed-text); background: transparent; box-sizing: border-box;
        outline: none; transition: border-color 0.2s;
      }
      .field input:focus, .field select:focus { border-color: var(--ed-accent); }

      .help { display: block; font-size: 11px; color: var(--ed-text2); margin-top: 4px; margin-bottom: 8px; }

      .inline-group { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
      .inline-group input[type="number"] {
        flex: 1; min-width: 60px; padding: 6px 8px; border: 1px solid var(--ed-border);
        border-radius: 6px; font-size: 12px; color: var(--ed-text); background: transparent; outline: none;
      }
      .inline-group input[type="range"] { flex: 1; accent-color: var(--ed-accent); }

      .unit, .sep { font-size: 12px; color: var(--ed-text2); }
      .label-sm { font-size: 11px; color: var(--ed-text2); }

      .check {
        display: flex; align-items: center; gap: 6px; font-size: 12px;
        color: var(--ed-text); cursor: pointer; white-space: nowrap;
      }
      .check input[type="checkbox"] { width: 15px; height: 15px; accent-color: var(--ed-accent); }

      .toggles { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }

      /* Buttons */
      .btn {
        padding: 6px 14px; border: 1px solid var(--ed-border); border-radius: 8px;
        background: transparent; color: var(--ed-text2); font-size: 12px;
        cursor: pointer; transition: all 0.2s; white-space: nowrap;
      }
      .btn:hover { border-color: var(--ed-accent); color: var(--ed-accent); }
      .btn-active { background: var(--ed-accent); color: white; border-color: var(--ed-accent); }
      .btn-primary { background: var(--ed-accent); color: white; border-color: var(--ed-accent); }
      .btn-primary:hover { opacity: 0.9; }
      .btn-add { border-style: dashed; color: var(--ed-accent); }
      .btn-add:hover { background: rgba(79, 195, 247, 0.06); }
      .btn-full { width: 100%; text-align: center; }

      .btn-icon {
        background: none; border: none; color: var(--ed-text2); cursor: pointer;
        padding: 4px; font-size: 14px; border-radius: 4px; flex-shrink: 0; transition: color 0.2s;
      }
      .btn-remove:hover { color: #E57373; }

      .btn-chip {
        display: inline-flex; align-items: center; gap: 4px; padding: 4px 12px;
        border: 1px solid rgba(76, 175, 80, 0.3); border-radius: 16px;
        background: transparent; color: var(--ed-success); font-size: 11px;
        cursor: pointer; transition: all 0.2s;
      }
      .btn-chip:hover { background: var(--ed-success); color: white; }

      .action-row { display: flex; gap: 8px; margin: 8px 0; flex-wrap: wrap; }

      /* Cards & Lists */
      .item-card {
        display: flex; gap: 10px; align-items: flex-start; padding: 12px;
        border: 1px solid var(--ed-border); border-radius: 10px;
        margin-bottom: 8px; transition: border-color 0.2s;
      }
      .item-card:hover { border-color: var(--ed-accent); }
      .item-card-highlight { border-color: var(--ed-accent); background: rgba(79, 195, 247, 0.04); }

      .item-body {
        flex: 1; display: flex; flex-direction: column; gap: 8px; min-width: 0;
      }
      .item-body input[type="text"], .item-body select {
        padding: 6px 8px; border: 1px solid var(--ed-border); border-radius: 6px;
        font-size: 12px; color: var(--ed-text); background: transparent;
        outline: none; width: 100%; box-sizing: border-box;
      }
      .item-body input:focus, .item-body select:focus { border-color: var(--ed-accent); }

      .items-list { margin-bottom: 8px; }

      .color-dot { width: 12px; height: 12px; border-radius: 50%; margin-top: 14px; flex-shrink: 0; }

      input[type="color"] {
        width: 32px; height: 28px; padding: 0; border: 1px solid var(--ed-border);
        border-radius: 4px; cursor: pointer; background: transparent;
      }

      /* Map */
      .large-map {
        position: relative; border: 1px solid var(--ed-border); border-radius: 10px;
        overflow: hidden; margin-bottom: 12px; cursor: crosshair; user-select: none;
      }
      .large-map img { width: 100%; display: block; opacity: 0.8; pointer-events: none; }

      .map-overlay {
        position: absolute; top: 0; left: 0; width: 100%; height: 100%;
        pointer-events: none;
      }

      .map-hint {
        position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%);
        background: rgba(0,0,0,0.75); color: white; padding: 6px 16px;
        border-radius: 16px; font-size: 12px; z-index: 10; white-space: nowrap;
        pointer-events: none;
      }

      @keyframes pulse-anim {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.4; }
      }
      .pulse-marker { animation: pulse-anim 1s ease-in-out infinite; }

      .dragging-marker { opacity: 0.7; }

      /* Proxy Tooltip */
      .proxy-tooltip {
        position: absolute;
        z-index: 100;
        background: rgba(0,0,0,0.88);
        color: #fff;
        padding: 10px 14px;
        border-radius: 10px;
        font-size: 11px;
        pointer-events: none;
        max-width: 300px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.3);
        backdrop-filter: blur(8px);
        line-height: 1.5;
      }
      .tooltip-title {
        font-size: 13px; font-weight: 600; margin-bottom: 6px;
        color: var(--ed-accent); border-bottom: 1px solid rgba(255,255,255,0.15);
        padding-bottom: 4px;
      }
      .tooltip-row { display: flex; gap: 6px; margin-bottom: 2px; }
      .tooltip-label { color: rgba(255,255,255,0.5); flex-shrink: 0; }
      .tooltip-value { color: #fff; word-break: break-all; }
      .tooltip-hint {
        margin-top: 6px; padding-top: 4px; border-top: 1px solid rgba(255,255,255,0.1);
        color: rgba(255,255,255,0.4); font-size: 10px; font-style: italic;
      }

      /* Auto-place results */
      .auto-place-results {
        padding: 10px 14px; background: rgba(79, 195, 247, 0.06);
        border: 1px solid rgba(79, 195, 247, 0.2); border-radius: 10px;
        margin-bottom: 12px; font-size: 11px; color: var(--ed-text);
      }
      .auto-place-line { padding: 2px 0; }
      .auto-place-line:first-child { font-weight: 600; margin-bottom: 4px; }

      /* Discovery box */
      .discovery-box {
        padding: 10px; border: 1px solid rgba(76, 175, 80, 0.25); border-radius: 10px;
        background: rgba(76, 175, 80, 0.04); margin-bottom: 12px;
      }
      .discovery-list { display: flex; flex-wrap: wrap; gap: 6px; }

      /* Success box */
      .success-box {
        display: flex; align-items: center; gap: 6px; padding: 8px 12px;
        background: rgba(76, 175, 80, 0.08); border: 1px solid rgba(76, 175, 80, 0.25);
        border-radius: 8px; font-size: 12px; color: var(--ed-success); margin-top: 4px;
      }
      .success-box strong { color: var(--ed-text); }

      .subsection { margin-bottom: 16px; }
      .subsection-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
      .field.inline { margin-bottom: 12px; }
      .field.inline label { margin-bottom: 6px; }
    `}render(){if(!this._config)return N;this.hass&&(this._lang=this.hass.selectedLanguage||this.hass.language||"en");const e=[{id:"floorplan",label:this._t("editor.floorplan")},{id:"proxies",label:this._t("editor.proxies")},{id:"zones",label:this._t("editor.zones")},{id:"devices",label:this._t("editor.devices")},{id:"appearance",label:this._t("editor.appearance")+" & "+this._t("editor.history")}];return j`
      <div class="tabs">
        ${e.map(e=>j`
            <button class="tab ${this._activeTab===e.id?"active":""}"
              @click=${()=>this._activeTab=e.id}>
              ${e.label}
            </button>
          `)}
      </div>

      ${"floorplan"===this._activeTab?this._renderFloorplanTab():N}
      ${"proxies"===this._activeTab?this._renderProxiesTab():N}
      ${"zones"===this._activeTab?this._renderZonesTab():N}
      ${"devices"===this._activeTab?this._renderDevicesTab():N}
      ${"appearance"===this._activeTab?this._renderAppearanceTab():N}
    `}};e([he({attribute:!1})],Ie.prototype,"hass",void 0),e([_e()],Ie.prototype,"_config",void 0),e([_e()],Ie.prototype,"_activeTab",void 0),e([_e()],Ie.prototype,"_placingProxy",void 0),e([_e()],Ie.prototype,"_drawingZone",void 0),e([_e()],Ie.prototype,"_drawingPoints",void 0),e([_e()],Ie.prototype,"_calibrating",void 0),e([_e()],Ie.prototype,"_calibrationPoints",void 0),e([_e()],Ie.prototype,"_calibrationMeters",void 0),e([_e()],Ie.prototype,"_hoveredProxy",void 0),e([_e()],Ie.prototype,"_hoverPos",void 0),e([_e()],Ie.prototype,"_draggingProxy",void 0),e([_e()],Ie.prototype,"_autoPlaceResults",void 0),Ie=e([ce(ye)],Ie);const Re="ble-livemap-panel-config";let Ze=class extends re{constructor(){super(...arguments),this.narrow=!1,this._config={type:"custom:ble-livemap-card",...ge},this._activeTab="map",this._saving=!1,this._saveMessage="",this._loaded=!1,this._sidebarFilter="",this._sidebarCategory="smart",this._activeFloorIdx=0,this._placingEntity=null,this._placingMode=null,this._drawingZone=!1,this._drawingPoints=[],this._drawingMode="rectangle",this._rectStart=null,this._rectPreview=null,this._calibrating=!1,this._calibrationPoints=[],this._calibrationMeters=0,this._draggingProxy=null,this._mapImageLoaded=!1,this._editingZoneIdx=null,this._lang="en"}connectedCallback(){super.connectedCallback(),this._loadConfig()}updated(e){super.updated(e),e.has("hass")&&this.hass&&(this._lang=this.hass.selectedLanguage||this.hass.language||"en")}_loadConfig(){try{const e=localStorage.getItem(Re);e&&(this._config={...ge,...JSON.parse(e)})}catch(e){console.warn("[BLE LiveMap Panel] Failed to load config:",e)}this._loaded=!0}_saveConfigLocal(){try{localStorage.setItem(Re,JSON.stringify(this._config))}catch(e){}}_updateConfig(e,t){this._config={...this._config,[e]:t},this._saveConfigLocal(),this.requestUpdate()}async _saveAndPush(){this._saveConfigLocal(),this._saving=!0,this._saveMessage=this._t("panel.saving");try{const e=await this.hass.callWS({type:"lovelace/config",url_path:null});if(e?.views){let t=!1;for(const i of e.views)if(i.cards)for(let e=0;e<i.cards.length;e++)i.cards[e].type===`custom:${me}`&&(i.cards[e]={...this._config,type:`custom:${me}`},t=!0);t?(await this.hass.callWS({type:"lovelace/config/save",url_path:null,config:e}),this._saveMessage=this._t("panel.saved")):this._saveMessage=this._t("panel.no_cards_found")}}catch(e){this._saveMessage=this._t("panel.save_error"),console.warn("[BLE LiveMap Panel] Save error:",e)}setTimeout(()=>{this._saving=!1,this._saveMessage=""},3e3)}_handleExportYaml(){const e=this._toYaml();navigator.clipboard.writeText(e).then(()=>{this._saveMessage=this._t("panel.yaml_copied"),this._saving=!0,setTimeout(()=>{this._saving=!1,this._saveMessage=""},2e3)})}_toYaml(){return`type: custom:${me}\n`+JSON.stringify(this._config,null,2)}_t(e){const t={en:{"panel.title":"BLE LiveMap Setup","panel.subtitle":"Configure your floor plan, proxies, devices and zones","panel.save":"Save & update cards","panel.saving":"Saving...","panel.saved":"Saved & cards updated!","panel.save_error":"Error saving to Lovelace","panel.no_cards_found":"No BLE LiveMap cards found on dashboards","panel.yaml_copied":"YAML copied to clipboard!","panel.copy_yaml":"Copy YAML","panel.tab_map":"Floor Plan","panel.tab_proxies":"Proxies","panel.tab_devices":"Devices","panel.tab_zones":"Zones","panel.tab_settings":"Settings","panel.sidebar_title":"Available Entities","panel.filter":"Search entities...","panel.category_smart":"Smart","panel.category_proxies":"Proxies","panel.category_devices":"Devices","panel.category_all":"All","panel.click_to_add":"Click to add to map","panel.already_added":"Already added","panel.click_map_to_place":"Click on the map to place","panel.cancel_placement":"Cancel","panel.no_entities":"No matching entities found","panel.floor_image":"Floor plan image URL","panel.floor_image_help":"Use /local/filename.png for images in your www folder","panel.floor_name":"Floor name","panel.add_floor":"+ Add floor","panel.remove_floor":"Remove floor","panel.floor_select":"Select floor","panel.calibrate":"Calibrate dimensions","panel.calibrate_help":"Click two points of a known distance on the map, then enter the real distance.","panel.calibrate_start":"Start calibration","panel.calibrate_cancel":"Cancel","panel.calibrate_distance":"Real distance (meters)","panel.calibrate_apply":"Apply","panel.width_m":"Width (m)","panel.height_m":"Height (m)","panel.zone_name":"Zone name","panel.zone_draw_polygon":"Draw polygon","panel.zone_draw_rectangle":"Draw rectangle","panel.zone_finish":"Finish zone","panel.zone_cancel":"Cancel drawing","panel.add_zone":"Add zone","panel.remove_zone":"Remove zone","panel.zone_color":"Fill color","panel.zone_border_color":"Border color","panel.zone_opacity":"Opacity","panel.zone_show_label":"Show label","panel.zone_edit":"Edit zone","panel.zone_editing":"Editing zone","panel.zone_done_editing":"Done editing","panel.auto_place":"Auto-place all","panel.auto_place_help":"Match proxy/device names to zone names and place at zone centers","panel.remove":"Remove","panel.placed":"Placed","panel.not_placed":"Not placed","panel.drag_to_move":"Drag to reposition","panel.info_banner":"Configure your BLE LiveMap here. Changes are auto-saved locally. Click 'Save & update cards' to push changes to your Lovelace dashboards.","panel.card_title":"Card title","panel.show_proxies":"Show proxy indicators","panel.show_zones":"Show zones","panel.show_zone_labels":"Show zone labels","panel.history_enabled":"Enable position history","panel.history_retention":"History retention (minutes)","panel.update_interval":"Update interval (seconds)","panel.floor_display":"Floor display mode","panel.floor_tabs":"Tabs","panel.floor_stacked":"Stacked","panel.theme":"Theme","panel.theme_auto":"Auto","panel.theme_dark":"Dark","panel.theme_light":"Light","panel.device_name":"Display name","panel.device_color":"Color","panel.device_icon":"Icon","panel.proxy_name":"Display name","panel.smart_help":"Showing only relevant BLE proxies and trackable devices detected from Bermuda","panel.proxy_section":"BLE Scanners / Proxies","panel.device_section":"Trackable Devices","panel.scanner_count":"scanners detected","panel.device_count":"trackable devices"},sv:{"panel.title":"BLE LiveMap Inställningar","panel.subtitle":"Konfigurera planritning, proxies, enheter och zoner","panel.save":"Spara & uppdatera kort","panel.saving":"Sparar...","panel.saved":"Sparat & kort uppdaterade!","panel.save_error":"Fel vid sparning till Lovelace","panel.no_cards_found":"Inga BLE LiveMap-kort hittades på dashboards","panel.yaml_copied":"YAML kopierad till urklipp!","panel.copy_yaml":"Kopiera YAML","panel.tab_map":"Planritning","panel.tab_proxies":"Proxies","panel.tab_devices":"Enheter","panel.tab_zones":"Zoner","panel.tab_settings":"Inställningar","panel.sidebar_title":"Tillgängliga enheter","panel.filter":"Sök enheter...","panel.category_smart":"Smart","panel.category_proxies":"Proxies","panel.category_devices":"Enheter","panel.category_all":"Alla","panel.click_to_add":"Klicka för att lägga till","panel.already_added":"Redan tillagd","panel.click_map_to_place":"Klicka på kartan för att placera","panel.cancel_placement":"Avbryt","panel.no_entities":"Inga matchande enheter hittades","panel.floor_image":"Planritnings-URL","panel.floor_image_help":"Använd /local/filnamn.png för bilder i din www-mapp","panel.floor_name":"Våningsnamn","panel.add_floor":"+ Lägg till våning","panel.remove_floor":"Ta bort våning","panel.floor_select":"Välj våning","panel.calibrate":"Kalibrera mått","panel.calibrate_help":"Klicka på två punkter med känt avstånd, ange sedan det verkliga avståndet.","panel.calibrate_start":"Starta kalibrering","panel.calibrate_cancel":"Avbryt","panel.calibrate_distance":"Verkligt avstånd (meter)","panel.calibrate_apply":"Tillämpa","panel.width_m":"Bredd (m)","panel.height_m":"Höjd (m)","panel.zone_name":"Zonnamn","panel.zone_draw_polygon":"Rita polygon","panel.zone_draw_rectangle":"Rita rektangel","panel.zone_finish":"Slutför zon","panel.zone_cancel":"Avbryt ritning","panel.add_zone":"Lägg till zon","panel.remove_zone":"Ta bort zon","panel.zone_color":"Fyllnadsfärg","panel.zone_border_color":"Kantfärg","panel.zone_opacity":"Opacitet","panel.zone_show_label":"Visa etikett","panel.zone_edit":"Redigera zon","panel.zone_editing":"Redigerar zon","panel.zone_done_editing":"Klar med redigering","panel.auto_place":"Auto-placera alla","panel.auto_place_help":"Matchar proxy-/enhetsnamn mot zonnamn och placerar i zonens mitt","panel.remove":"Ta bort","panel.placed":"Placerad","panel.not_placed":"Ej placerad","panel.drag_to_move":"Dra för att flytta","panel.info_banner":"Konfigurera din BLE LiveMap här. Ändringar sparas automatiskt lokalt. Klicka 'Spara & uppdatera kort' för att pusha ändringar till dina Lovelace-dashboards.","panel.card_title":"Korttitel","panel.show_proxies":"Visa proxy-indikatorer","panel.show_zones":"Visa zoner","panel.show_zone_labels":"Visa zonetiketter","panel.history_enabled":"Aktivera positionshistorik","panel.history_retention":"Historiklagring (minuter)","panel.update_interval":"Uppdateringsintervall (sekunder)","panel.floor_display":"Våningsvisningsläge","panel.floor_tabs":"Flikar","panel.floor_stacked":"Staplade","panel.theme":"Tema","panel.theme_auto":"Auto","panel.theme_dark":"Mörkt","panel.theme_light":"Ljust","panel.device_name":"Visningsnamn","panel.device_color":"Färg","panel.device_icon":"Ikon","panel.proxy_name":"Visningsnamn","panel.smart_help":"Visar bara relevanta BLE-proxies och spårbara enheter från Bermuda","panel.proxy_section":"BLE-skannrar / Proxies","panel.device_section":"Spårbara enheter","panel.scanner_count":"skannrar hittade","panel.device_count":"spårbara enheter"}},i=this._lang.startsWith("sv")?"sv":"en";return t[i]?.[e]||t.en?.[e]||e}_discoverBermudaProxies(){if(!this.hass?.states)return new Map;const e=new Map;for(const[t,i]of Object.entries(this.hass.states)){const i=t.toLowerCase();if(i.startsWith("sensor.bermuda_")&&i.includes("_distance_to_")){const o=i.split("_distance_to_");if(o.length>=2){const i=o[o.length-1];if(e.has(i))e.get(i).entity_ids.push(t);else{const o=i.replace(/_/g," ").replace(/\b\w/g,e=>e.toUpperCase());e.set(i,{id:i,friendly_name:o,entity_ids:[t]})}}}}return e}_discoverTrackableDevices(){if(!this.hass?.states)return[];const e=new Set((this._config.tracked_devices||[]).map(e=>e.entity_prefix)),t=[];for(const[i,o]of Object.entries(this.hass.states)){if(i.toLowerCase().startsWith("device_tracker.bermuda_")){const a=o?.attributes?.friendly_name||i,n=o?.state||"";t.push({entity_id:i,friendly_name:a,area:n,state:n,type:"device",added:e.has(i)})}}return t.sort((e,t)=>e.added!==t.added?e.added?1:-1:e.friendly_name.localeCompare(t.friendly_name)),t}_discoverEntities(){return this.hass?.states?"smart"===this._sidebarCategory||"proxies"===this._sidebarCategory?this._getSmartProxyList():"devices"===this._sidebarCategory?this._getSmartDeviceList():this._getAllEntities():[]}_getSmartProxyList(){const e=this._discoverBermudaProxies(),t=new Set((this._config.proxies||[]).map(e=>e.entity_id)),i=[];for(const[o,a]of e){const e=`bermuda_proxy_${o}`,n=t.has(e)||t.has(o)||(this._config.proxies||[]).some(e=>e.entity_id.includes(o)||(e.name||"").toLowerCase().replace(/\s+/g,"_").includes(o)),s={entity_id:e,friendly_name:a.friendly_name,area:"",state:`${a.entity_ids.length} devices tracked`,type:"proxy",added:n,proxy_id:o};if(this._sidebarFilter){const e=this._sidebarFilter.toLowerCase();if(!o.includes(e)&&!a.friendly_name.toLowerCase().includes(e))continue}i.push(s)}return i.sort((e,t)=>e.added!==t.added?e.added?1:-1:e.friendly_name.localeCompare(t.friendly_name)),i}_getSmartDeviceList(){const e=this._discoverTrackableDevices();if(!this._sidebarFilter)return e;const t=this._sidebarFilter.toLowerCase();return e.filter(e=>e.entity_id.toLowerCase().includes(t)||e.friendly_name.toLowerCase().includes(t)||e.area.toLowerCase().includes(t))}_getAllEntities(){if(!this.hass?.states)return[];const e=new Set((this._config.proxies||[]).map(e=>e.entity_id)),t=new Set((this._config.tracked_devices||[]).map(e=>e.entity_prefix)),i=[];for(const[o,a]of Object.entries(this.hass.states)){const n=a?.attributes?.friendly_name||o,s=a?.attributes?.area||"",r=a?.state||"";if(this._sidebarFilter){const e=this._sidebarFilter.toLowerCase();if(!o.toLowerCase().includes(e)&&!n.toLowerCase().includes(e))continue}const l=o.toLowerCase();let c="unknown",d=!1;l.startsWith("device_tracker.bermuda_")?(c="device",d=t.has(o)):(l.includes("bermuda")||l.includes("ble_proxy")||l.includes("bluetooth_proxy"))&&(c="proxy",d=e.has(o)),i.push({entity_id:o,friendly_name:n,area:s,state:r,type:c,added:d})}return i.sort((e,t)=>e.added!==t.added?e.added?1:-1:e.type!==t.type?"proxy"===e.type?-1:"proxy"===t.type?1:"device"===e.type?-1:1:e.friendly_name.localeCompare(t.friendly_name)),i}_getFloors(){return this._config.floors&&this._config.floors.length>0?this._config.floors:this._config.floorplan_image?[{id:"floor_0",name:"Floor 1",image:this._config.floorplan_image,image_width:this._config.image_width||20,image_height:this._config.image_height||15}]:[]}_getActiveFloor(){const e=this._getFloors();return e[this._activeFloorIdx]||e[0]||null}_addFloor(){const e=[...this._getFloors()],t=`floor_${e.length}`;e.push({id:t,name:`Floor ${e.length+1}`,image:"",image_width:20,image_height:15}),this._updateConfig("floors",e),this._activeFloorIdx=e.length-1}_removeFloor(e){const t=[...this._getFloors()];if(t.length<=1)return;const i=t[e].id;t.splice(e,1),this._updateConfig("floors",t);const o=(this._config.proxies||[]).filter(e=>e.floor_id!==i);this._updateConfig("proxies",o);const a=(this._config.zones||[]).filter(e=>e.floor_id!==i);this._updateConfig("zones",a),this._activeFloorIdx>=t.length&&(this._activeFloorIdx=t.length-1)}_updateFloor(e,t,i){const o=[...this._getFloors()];o[e]&&(o[e]={...o[e],[t]:i},this._updateConfig("floors",o),0===e&&("image"===t&&this._updateConfig("floorplan_image",i),"image_width"===t&&this._updateConfig("image_width",i),"image_height"===t&&this._updateConfig("image_height",i)))}_addEntityAsProxy(e){const t=[...this._config.proxies||[]];if(t.some(t=>t.entity_id===e.entity_id))return;const i=e.friendly_name||e.entity_id.replace(/^.*\./,"").replace(/_/g," ");t.push({entity_id:e.entity_id,name:i,x:0,y:0,floor_id:this._getActiveFloor()?.id||"floor_0"}),this._updateConfig("proxies",t),this._placingEntity=e,this._placingMode="proxy"}_addEntityAsDevice(e){const t=[...this._config.tracked_devices||[]];if(t.some(t=>t.entity_prefix===e.entity_id))return;const i=e.friendly_name||e.entity_id.replace(/^.*\./,"").replace(/_/g," "),o=t.length%ve.length;t.push({entity_prefix:e.entity_id,bermuda_device_id:e.entity_id,name:i,color:ve[o],icon:"phone",show_trail:!0,show_label:!0}),this._updateConfig("tracked_devices",t)}_handleEntityClick(e){e.added||("proxy"===e.type||"proxies"===this._activeTab&&"devices"!==this._sidebarCategory?this._addEntityAsProxy(e):this._addEntityAsDevice(e))}_removeProxy(e){const t=[...this._config.proxies||[]];t.splice(e,1),this._updateConfig("proxies",t)}_removeDevice(e){const t=[...this._config.tracked_devices||[]];t.splice(e,1),this._updateConfig("tracked_devices",t)}_removeZone(e){const t=[...this._config.zones||[]];t.splice(e,1),this._updateConfig("zones",t),this._editingZoneIdx===e&&(this._editingZoneIdx=null)}_getMapCoords(e){const t=this.shadowRoot?.querySelector(".map-image");if(!t)return null;const i=t.getBoundingClientRect();return{x:(e.clientX-i.left)/i.width*100,y:(e.clientY-i.top)/i.height*100}}_handleMapClick(e){const t=this._getMapCoords(e);if(!t)return;const{x:i,y:o}=t;if(this._calibrating)return this._calibrationPoints=[...this._calibrationPoints,{x:i,y:o}],void(this._calibrationPoints.length>=2&&this.requestUpdate());if(this._drawingZone&&"rectangle"===this._drawingMode){if(this._rectStart){const e=this._rectStart,t={x:i,y:o},a=[{x:Math.min(e.x,t.x),y:Math.min(e.y,t.y)},{x:Math.max(e.x,t.x),y:Math.min(e.y,t.y)},{x:Math.max(e.x,t.x),y:Math.max(e.y,t.y)},{x:Math.min(e.x,t.x),y:Math.max(e.y,t.y)}];this._finishZone(a),this._rectStart=null,this._rectPreview=null}else this._rectStart={x:i,y:o},this._rectPreview=null;return}if(this._drawingZone&&"polygon"===this._drawingMode){const e=[...this._drawingPoints,{x:i,y:o}];if(e.length>=3){const t=i-e[0].x,a=o-e[0].y;if(Math.sqrt(t*t+a*a)<3)return void this._finishZone(e)}return void(this._drawingPoints=e)}if("proxy"===this._placingMode&&this._placingEntity){const e=[...this._config.proxies||[]],t=e.findIndex(e=>e.entity_id===this._placingEntity.entity_id);return t>=0&&(e[t]={...e[t],x:i,y:o},this._updateConfig("proxies",e)),this._placingEntity=null,void(this._placingMode=null)}if("zones"===this._activeTab&&!this._drawingZone){const e=this._config.zones||[];for(let t=e.length-1;t>=0;t--)if(this._isPointInZone(i,o,e[t]))return this._editingZoneIdx=t,void this.requestUpdate();return this._editingZoneIdx=null,void this.requestUpdate()}const a=this._config.proxies||[];for(let e=0;e<a.length;e++){const t=a[e].x,n=a[e].y;if(Math.abs(i-t)<3&&Math.abs(o-n)<3)return void(this._draggingProxy=e)}}_handleMapMouseMove(e){if(this._drawingZone&&"rectangle"===this._drawingMode&&this._rectStart){const t=this._getMapCoords(e);t&&(this._rectPreview=t)}if(null!==this._draggingProxy){const t=this._getMapCoords(e);if(t){const e=[...this._config.proxies||[]];e[this._draggingProxy]&&(e[this._draggingProxy]={...e[this._draggingProxy],x:t.x,y:t.y},this._updateConfig("proxies",e))}}}_handleMapMouseUp(){null!==this._draggingProxy&&(this._draggingProxy=null)}_isPointInZone(e,t,i){const o=i.points||[];if(o.length<3)return!1;let a=!1;for(let i=0,n=o.length-1;i<o.length;n=i++){const s=o[i].x,r=o[i].y,l=o[n].x,c=o[n].y;r>t!=c>t&&e<(l-s)*(t-r)/(c-r)+s&&(a=!a)}return a}_startDrawingZone(e){this._drawingZone=!0,this._drawingMode=e,this._drawingPoints=[],this._rectStart=null,this._rectPreview=null,this._editingZoneIdx=null}_cancelDrawing(){this._drawingZone=!1,this._drawingPoints=[],this._rectStart=null,this._rectPreview=null}_finishZone(e){const t=e||this._drawingPoints;if(t.length<3)return;const i=[...this._config.zones||[]],o=i.length%ue.length,a=this._getActiveFloor();i.push({id:`zone_${Date.now()}`,name:"",points:t,color:ue[o],border_color:ue[o],opacity:.3,show_label:!0,floor_id:a?.id||"floor_0"}),this._updateConfig("zones",i),this._drawingZone=!1,this._drawingPoints=[],this._rectStart=null,this._rectPreview=null,this._editingZoneIdx=i.length-1}_startCalibration(){this._calibrating=!0,this._calibrationPoints=[],this._calibrationMeters=0}_cancelCalibration(){this._calibrating=!1,this._calibrationPoints=[]}_applyCalibration(){if(this._calibrationPoints.length<2||this._calibrationMeters<=0)return;const e=this.shadowRoot?.querySelector(".map-image");if(!e)return;const t=this._calibrationPoints[0],i=this._calibrationPoints[1],o=Math.sqrt(Math.pow((i.x-t.x)*e.naturalWidth/100,2)+Math.pow((i.y-t.y)*e.naturalHeight/100,2)),a=this._calibrationMeters/o,n=Math.round(e.naturalWidth*a*100)/100,s=Math.round(e.naturalHeight*a*100)/100;this._updateFloor(this._activeFloorIdx,"image_width",n),this._updateFloor(this._activeFloorIdx,"image_height",s),this._calibrating=!1,this._calibrationPoints=[]}_autoPlaceProxies(){const e=this._config.zones||[];if(0===e.length)return;const t=[...this._config.proxies||[]];let i=0;for(let o=0;o<t.length;o++){const a=(t[o].name||t[o].entity_id||"").toLowerCase(),n=t[o].entity_id.replace(/^.*\./,"").replace(/_/g," ").toLowerCase().split(" ");for(const s of e){const e=(s.name||"").toLowerCase();if(!e)continue;if(a.includes(e)||e.split(" ").some(e=>e.length>2&&a.includes(e))||n.some(t=>t.length>2&&e.includes(t))){const e=s.points.reduce((e,t)=>e+t.x,0)/s.points.length,a=s.points.reduce((e,t)=>e+t.y,0)/s.points.length;t[o]={...t[o],x:e,y:a,floor_id:s.floor_id},i++;break}}}this._updateConfig("proxies",t),this._saveMessage=`${this._t("panel.auto_place")}: ${i} ${this._t("panel.placed").toLowerCase()}`,this._saving=!0,setTimeout(()=>{this._saving=!1,this._saveMessage=""},2e3)}static get styles(){return s`
      :host {
        display: block;
        height: 100%;
        --card-bg: var(--ha-card-background, var(--card-background-color, #fff));
        --text-primary: var(--primary-text-color, #212121);
        --text-secondary: var(--secondary-text-color, #727272);
        --accent: var(--primary-color, #4FC3F7);
        --sidebar-width: 320px;
      }

      .panel-container {
        height: 100%;
        display: flex;
        flex-direction: column;
        background: var(--primary-background-color, #fafafa);
      }

      /* ── Top Bar ── */
      .top-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 20px;
        background: var(--card-bg);
        border-bottom: 1px solid var(--divider-color, rgba(0,0,0,0.08));
        flex-shrink: 0;
        gap: 12px;
      }

      .top-left {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .top-icon {
        width: 32px;
        height: 32px;
        background: var(--accent);
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        flex-shrink: 0;
      }

      .top-icon svg { width: 20px; height: 20px; }

      .top-title {
        font-size: 18px;
        font-weight: 600;
        color: var(--text-primary);
      }

      .top-version {
        font-size: 11px;
        color: var(--text-secondary);
      }

      .top-actions {
        display: flex;
        gap: 8px;
        align-items: center;
      }

      /* ── Tabs ── */
      .tab-bar {
        display: flex;
        background: var(--card-bg);
        border-bottom: 1px solid var(--divider-color, rgba(0,0,0,0.08));
        flex-shrink: 0;
        overflow-x: auto;
      }

      .tab {
        padding: 10px 20px;
        font-size: 13px;
        font-weight: 500;
        color: var(--text-secondary);
        cursor: pointer;
        border-bottom: 2px solid transparent;
        transition: all 0.2s;
        white-space: nowrap;
        background: none;
        border-top: none;
        border-left: none;
        border-right: none;
      }

      .tab:hover { color: var(--text-primary); }

      .tab.active {
        color: var(--accent);
        border-bottom-color: var(--accent);
      }

      /* ── Main Content ── */
      .main-content {
        flex: 1;
        display: flex;
        overflow: hidden;
      }

      /* ── Entity Sidebar ── */
      .entity-sidebar {
        width: var(--sidebar-width);
        flex-shrink: 0;
        background: var(--card-bg);
        border-right: 1px solid var(--divider-color, rgba(0,0,0,0.08));
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .sidebar-header {
        padding: 12px 16px;
        border-bottom: 1px solid var(--divider-color, rgba(0,0,0,0.06));
      }

      .sidebar-title {
        font-size: 13px;
        font-weight: 600;
        color: var(--text-primary);
        margin-bottom: 8px;
      }

      .sidebar-filter {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid var(--divider-color, rgba(0,0,0,0.12));
        border-radius: 8px;
        font-size: 13px;
        background: var(--primary-background-color, #fafafa);
        color: var(--text-primary);
        outline: none;
        box-sizing: border-box;
      }

      .sidebar-filter:focus {
        border-color: var(--accent);
      }

      .sidebar-categories {
        display: flex;
        gap: 4px;
        padding: 8px 16px;
        border-bottom: 1px solid var(--divider-color, rgba(0,0,0,0.06));
      }

      .cat-btn {
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 11px;
        border: 1px solid var(--divider-color, rgba(0,0,0,0.12));
        background: none;
        color: var(--text-secondary);
        cursor: pointer;
        transition: all 0.15s;
      }

      .cat-btn.active {
        background: var(--accent);
        color: white;
        border-color: var(--accent);
      }

      .sidebar-list {
        flex: 1;
        overflow-y: auto;
        padding: 4px 0;
      }

      .sidebar-section-header {
        padding: 10px 16px 4px;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: var(--text-secondary);
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .sidebar-section-count {
        font-weight: 400;
        opacity: 0.7;
      }

      .entity-item {
        display: flex;
        align-items: center;
        padding: 8px 16px;
        gap: 10px;
        cursor: pointer;
        transition: background 0.15s;
        border: none;
        background: none;
        width: 100%;
        text-align: left;
      }

      .entity-item:hover {
        background: var(--divider-color, rgba(0,0,0,0.03));
      }

      .entity-item.added {
        opacity: 0.5;
        cursor: default;
      }

      .entity-item.placing {
        background: rgba(79, 195, 247, 0.1);
        border-left: 3px solid var(--accent);
      }

      .entity-type-badge {
        font-size: 9px;
        font-weight: 600;
        text-transform: uppercase;
        padding: 2px 6px;
        border-radius: 4px;
        flex-shrink: 0;
      }

      .badge-proxy {
        background: #E3F2FD;
        color: #1565C0;
      }

      .badge-device {
        background: #E8F5E9;
        color: #2E7D32;
      }

      .badge-unknown {
        background: #F5F5F5;
        color: #757575;
      }

      .entity-info {
        flex: 1;
        min-width: 0;
      }

      .entity-name {
        font-size: 13px;
        font-weight: 500;
        color: var(--text-primary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .entity-id {
        font-size: 11px;
        color: var(--text-secondary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .entity-area {
        font-size: 11px;
        color: var(--accent);
      }

      .entity-status {
        font-size: 10px;
        color: var(--text-secondary);
        flex-shrink: 0;
      }

      .entity-check {
        color: #4CAF50;
        flex-shrink: 0;
      }

      .smart-help {
        padding: 8px 16px;
        font-size: 11px;
        color: var(--text-secondary);
        background: rgba(79, 195, 247, 0.05);
        border-bottom: 1px solid var(--divider-color, rgba(0,0,0,0.06));
        font-style: italic;
      }

      /* ── Map Area ── */
      .map-area {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        padding: 16px;
      }

      .map-toolbar {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 12px;
        flex-wrap: wrap;
      }

      .floor-tabs {
        display: flex;
        gap: 4px;
        margin-bottom: 12px;
      }

      .floor-tab {
        padding: 6px 14px;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 500;
        border: 1px solid var(--divider-color, rgba(0,0,0,0.12));
        background: none;
        color: var(--text-secondary);
        cursor: pointer;
        transition: all 0.15s;
      }

      .floor-tab.active {
        background: var(--accent);
        color: white;
        border-color: var(--accent);
      }

      .floor-tab:hover:not(.active) {
        background: var(--divider-color, rgba(0,0,0,0.05));
      }

      .map-wrapper {
        flex: 1;
        position: relative;
        overflow: auto;
        background: var(--divider-color, rgba(0,0,0,0.03));
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .map-inner {
        position: relative;
        display: inline-block;
        max-width: 100%;
        max-height: 100%;
      }

      .map-image {
        display: block;
        max-width: 100%;
        max-height: calc(100vh - 260px);
        object-fit: contain;
        cursor: crosshair;
      }

      .map-image.dragging {
        cursor: grabbing;
      }

      .map-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
      }

      /* Zone overlays */
      .zone-polygon {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
      }

      .zone-polygon.clickable {
        pointer-events: all;
        cursor: pointer;
      }

      .zone-label-overlay {
        position: absolute;
        transform: translate(-50%, -50%);
        font-size: 11px;
        font-weight: 600;
        color: rgba(255,255,255,0.9);
        text-shadow: 0 1px 3px rgba(0,0,0,0.5);
        pointer-events: none;
        white-space: nowrap;
      }

      /* Proxy markers */
      .proxy-marker {
        position: absolute;
        transform: translate(-50%, -50%);
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: #2196F3;
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: 700;
        cursor: grab;
        pointer-events: all;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        transition: transform 0.1s;
        z-index: 10;
      }

      .proxy-marker:hover {
        transform: translate(-50%, -50%) scale(1.2);
      }

      .proxy-label {
        position: absolute;
        transform: translate(-50%, 0);
        font-size: 10px;
        color: var(--text-primary);
        text-shadow: 0 0 3px var(--card-bg), 0 0 3px var(--card-bg);
        white-space: nowrap;
        pointer-events: none;
        font-weight: 500;
      }

      /* Drawing points */
      .draw-point {
        position: absolute;
        transform: translate(-50%, -50%);
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: #FF5722;
        border: 2px solid white;
        pointer-events: none;
        z-index: 20;
      }

      .rect-preview, .cal-line {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
      }

      .cal-point {
        position: absolute;
        transform: translate(-50%, -50%);
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: #FF9800;
        border: 2px solid white;
        pointer-events: none;
        z-index: 20;
      }

      /* Placement banner */
      .placement-banner {
        background: rgba(79, 195, 247, 0.1);
        border: 1px solid var(--accent);
        border-radius: 8px;
        padding: 10px 16px;
        margin-bottom: 12px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 13px;
        color: var(--text-primary);
      }

      /* Zone edit panel */
      .zone-edit-panel {
        background: var(--card-bg);
        border: 1px solid var(--divider-color, rgba(0,0,0,0.12));
        border-radius: 10px;
        padding: 14px;
        margin-bottom: 12px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      }

      .zone-edit-panel h4 {
        margin: 0 0 10px;
        font-size: 14px;
        font-weight: 600;
        color: var(--text-primary);
      }

      .zone-edit-row {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 8px;
      }

      .zone-edit-row label {
        font-size: 12px;
        color: var(--text-secondary);
        min-width: 80px;
      }

      .zone-edit-row input[type="text"] {
        flex: 1;
        padding: 6px 10px;
        border: 1px solid var(--divider-color, rgba(0,0,0,0.12));
        border-radius: 6px;
        font-size: 12px;
        background: var(--primary-background-color, #fafafa);
        color: var(--text-primary);
        outline: none;
      }

      .zone-edit-row input[type="color"] {
        width: 36px;
        height: 28px;
        padding: 2px;
        border: 1px solid var(--divider-color, rgba(0,0,0,0.12));
        border-radius: 4px;
        cursor: pointer;
      }

      .zone-edit-row input[type="range"] {
        flex: 1;
      }

      .zone-edit-row input[type="checkbox"] {
        width: 16px;
        height: 16px;
      }

      /* Config panels */
      .config-panel {
        padding: 16px;
        flex: 1;
        overflow-y: auto;
      }

      .config-section {
        background: var(--card-bg);
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 16px;
        box-shadow: 0 1px 4px rgba(0,0,0,0.04);
      }

      .config-section h3 {
        margin: 0 0 12px;
        font-size: 15px;
        font-weight: 600;
        color: var(--text-primary);
      }

      .config-row {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 10px;
      }

      .config-row label {
        font-size: 13px;
        color: var(--text-secondary);
        min-width: 140px;
        flex-shrink: 0;
      }

      .config-row input,
      .config-row select {
        flex: 1;
        padding: 8px 12px;
        border: 1px solid var(--divider-color, rgba(0,0,0,0.12));
        border-radius: 8px;
        font-size: 13px;
        background: var(--primary-background-color, #fafafa);
        color: var(--text-primary);
        outline: none;
      }

      .config-row input:focus,
      .config-row select:focus {
        border-color: var(--accent);
      }

      .config-row input[type="checkbox"] {
        flex: none;
        width: 18px;
        height: 18px;
      }

      .config-row input[type="color"] {
        flex: none;
        width: 40px;
        height: 32px;
        padding: 2px;
        cursor: pointer;
      }

      .config-row input[type="range"] {
        flex: 1;
      }

      /* Item list */
      .item-list {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .item-card {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 12px;
        background: var(--primary-background-color, #fafafa);
        border-radius: 8px;
        transition: background 0.15s;
      }

      .item-card:hover {
        background: var(--divider-color, rgba(0,0,0,0.05));
      }

      .item-color {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        flex-shrink: 0;
      }

      .item-info {
        flex: 1;
        min-width: 0;
      }

      .item-name {
        font-size: 13px;
        font-weight: 500;
        color: var(--text-primary);
      }

      .item-detail {
        font-size: 11px;
        color: var(--text-secondary);
      }

      .item-actions {
        display: flex;
        gap: 4px;
      }

      /* Buttons */
      .btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 7px 14px;
        border-radius: 8px;
        border: none;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
      }

      .btn-primary {
        background: var(--accent);
        color: white;
      }

      .btn-primary:hover { filter: brightness(1.1); }

      .btn-secondary {
        background: var(--divider-color, rgba(0,0,0,0.05));
        color: var(--text-primary);
      }

      .btn-secondary:hover {
        background: var(--divider-color, rgba(0,0,0,0.1));
      }

      .btn-danger {
        background: none;
        color: #E53935;
        padding: 4px 8px;
      }

      .btn-danger:hover {
        background: rgba(229, 57, 53, 0.08);
      }

      .btn-small {
        padding: 4px 10px;
        font-size: 11px;
      }

      .btn svg {
        width: 14px;
        height: 14px;
      }

      .save-msg {
        font-size: 12px;
        color: #4CAF50;
        font-weight: 500;
      }

      /* Empty state */
      .empty-map {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 60px 20px;
        color: var(--text-secondary);
        text-align: center;
        flex: 1;
      }

      .empty-map svg {
        width: 64px;
        height: 64px;
        opacity: 0.2;
        margin-bottom: 16px;
      }

      .empty-map p {
        margin: 4px 0;
        font-size: 14px;
      }

      /* Responsive */
      @media (max-width: 900px) {
        .main-content {
          flex-direction: column;
        }

        .entity-sidebar {
          width: 100%;
          max-height: 200px;
          border-right: none;
          border-bottom: 1px solid var(--divider-color, rgba(0,0,0,0.08));
        }
      }
    `}render(){return this._loaded?j`
      <div class="panel-container">
        ${this._renderTopBar()}
        ${this._renderTabBar()}
        <div class="main-content">
          ${"settings"===this._activeTab?this._renderSettingsPanel():j`
                ${this._renderEntitySidebar()}
                ${this._renderMapArea()}
              `}
        </div>
      </div>
    `:j`<div style="padding:40px;text-align:center;">Loading...</div>`}_renderTopBar(){return j`
      <div class="top-bar">
        <div class="top-left">
          <div class="top-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
          </div>
          <div>
            <div class="top-title">BLE LiveMap</div>
            <div class="top-version">v${be}</div>
          </div>
        </div>
        <div class="top-actions">
          ${this._saving?j`<span class="save-msg">${this._saveMessage}</span>`:N}
          <button class="btn btn-secondary" @click=${this._handleExportYaml}>
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
            ${this._t("panel.copy_yaml")}
          </button>
          <button class="btn btn-primary" @click=${this._saveAndPush}>
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/></svg>
            ${this._t("panel.save")}
          </button>
        </div>
      </div>
    `}_renderTabBar(){const e=[{id:"map",label:this._t("panel.tab_map")},{id:"proxies",label:this._t("panel.tab_proxies")},{id:"devices",label:this._t("panel.tab_devices")},{id:"zones",label:this._t("panel.tab_zones")},{id:"settings",label:this._t("panel.tab_settings")}];return j`
      <div class="tab-bar">
        ${e.map(e=>j`
          <button
            class="tab ${this._activeTab===e.id?"active":""}"
            @click=${()=>{this._activeTab=e.id,this._editingZoneIdx=null}}
          >${e.label}</button>
        `)}
      </div>
    `}_renderEntitySidebar(){if("smart"===this._sidebarCategory){const e=this._getSmartProxyList(),t=this._getSmartDeviceList();return j`
        <div class="entity-sidebar">
          <div class="sidebar-header">
            <div class="sidebar-title">${this._t("panel.sidebar_title")}</div>
            <input
              class="sidebar-filter"
              type="text"
              placeholder="${this._t("panel.filter")}"
              .value=${this._sidebarFilter}
              @input=${e=>{this._sidebarFilter=e.target.value}}
            />
          </div>
          <div class="sidebar-categories">
            ${["smart","proxies","devices","all"].map(e=>j`
              <button
                class="cat-btn ${this._sidebarCategory===e?"active":""}"
                @click=${()=>{this._sidebarCategory=e}}
              >${this._t(`panel.category_${e}`)}</button>
            `)}
          </div>
          <div class="smart-help">${this._t("panel.smart_help")}</div>
          <div class="sidebar-list">
            <!-- Proxy section -->
            <div class="sidebar-section-header">
              ${this._t("panel.proxy_section")}
              <span class="sidebar-section-count">(${e.length} ${this._t("panel.scanner_count")})</span>
            </div>
            ${0===e.length?j`<div style="padding:8px 16px;font-size:12px;color:var(--text-secondary);">No Bermuda proxies detected</div>`:e.map(e=>this._renderEntityItem(e))}

            <!-- Device section -->
            <div class="sidebar-section-header" style="margin-top:8px;">
              ${this._t("panel.device_section")}
              <span class="sidebar-section-count">(${t.length} ${this._t("panel.device_count")})</span>
            </div>
            ${0===t.length?j`<div style="padding:8px 16px;font-size:12px;color:var(--text-secondary);">No trackable devices found</div>`:t.map(e=>this._renderEntityItem(e))}
          </div>
        </div>
      `}const e=this._discoverEntities();return j`
      <div class="entity-sidebar">
        <div class="sidebar-header">
          <div class="sidebar-title">${this._t("panel.sidebar_title")}</div>
          <input
            class="sidebar-filter"
            type="text"
            placeholder="${this._t("panel.filter")}"
            .value=${this._sidebarFilter}
            @input=${e=>{this._sidebarFilter=e.target.value}}
          />
        </div>
        <div class="sidebar-categories">
          ${["smart","proxies","devices","all"].map(e=>j`
            <button
              class="cat-btn ${this._sidebarCategory===e?"active":""}"
              @click=${()=>{this._sidebarCategory=e}}
            >${this._t(`panel.category_${e}`)}</button>
          `)}
        </div>
        <div class="sidebar-list">
          ${0===e.length?j`<div style="padding:20px;text-align:center;color:var(--text-secondary);font-size:13px;">${this._t("panel.no_entities")}</div>`:e.map(e=>this._renderEntityItem(e))}
        </div>
      </div>
    `}_renderEntityItem(e){return j`
      <button
        class="entity-item ${e.added?"added":""} ${this._placingEntity?.entity_id===e.entity_id?"placing":""}"
        @click=${()=>this._handleEntityClick(e)}
      >
        <span class="entity-type-badge badge-${e.type}">${"proxy"===e.type?"P":"device"===e.type?"D":"?"}</span>
        <div class="entity-info">
          <div class="entity-name">${e.friendly_name}</div>
          <div class="entity-id">${e.proxy_id||e.entity_id}</div>
          ${e.area?j`<div class="entity-area">${e.area}</div>`:N}
        </div>
        ${e.added?j`<span class="entity-check">\u2713</span>`:j`<span class="entity-status">${e.state}</span>`}
      </button>
    `}_renderMapArea(){const e=this._getFloors(),t=this._getActiveFloor(),i=t?.image;return j`
      <div class="map-area">
        <!-- Floor tabs (if multiple floors) -->
        ${e.length>1?j`
          <div class="floor-tabs">
            ${e.map((e,t)=>j`
              <button
                class="floor-tab ${this._activeFloorIdx===t?"active":""}"
                @click=${()=>{this._activeFloorIdx=t,this._mapImageLoaded=!1}}
              >${e.name||`Floor ${t+1}`}</button>
            `)}
          </div>
        `:N}

        <!-- Placement banner -->
        ${this._placingEntity?j`
          <div class="placement-banner">
            <span>${this._t("panel.click_map_to_place")}: <strong>${this._placingEntity.friendly_name}</strong></span>
            <button class="btn btn-small btn-secondary" @click=${()=>{this._placingEntity=null,this._placingMode=null}}>
              ${this._t("panel.cancel_placement")}
            </button>
          </div>
        `:N}

        <!-- Map toolbar -->
        ${"map"===this._activeTab?this._renderMapToolbar():N}
        ${"zones"===this._activeTab?this._renderZoneToolbar():N}
        ${"proxies"===this._activeTab?this._renderProxyToolbar():N}

        <!-- Zone edit panel -->
        ${null!==this._editingZoneIdx&&"zones"===this._activeTab?this._renderZoneEditPanel():N}

        <!-- Map -->
        ${i?j`
          <div class="map-wrapper">
            <div class="map-inner">
              <img
                class="map-image ${null!==this._draggingProxy?"dragging":""}"
                src=${t.image}
                @load=${()=>{this._mapImageLoaded=!0}}
                @click=${this._handleMapClick}
                @mousemove=${this._handleMapMouseMove}
                @mouseup=${this._handleMapMouseUp}
                @mouseleave=${this._handleMapMouseUp}
                crossorigin="anonymous"
              />
              ${this._mapImageLoaded?j`
                <div class="map-overlay">
                  ${this._renderZoneOverlays()}
                  ${this._renderProxyMarkers()}
                  ${this._renderDrawingPoints()}
                  ${this._renderRectPreview()}
                  ${this._renderCalibrationOverlay()}
                </div>
              `:N}
            </div>
          </div>
        `:j`
          <div class="empty-map">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zM5 15h14v3H5z"/>
            </svg>
            <p>${this._t("panel.floor_image_help")}</p>
            <div style="margin-top:16px;">
              <div class="config-row">
                <label>${this._t("panel.floor_image")}</label>
                <input
                  type="text"
                  placeholder="/local/floorplan.png"
                  .value=${this._config.floorplan_image||""}
                  @change=${e=>{const t=e.target.value;this._updateConfig("floorplan_image",t);0===this._getFloors().length&&this._updateConfig("floors",[{id:"floor_0",name:"Floor 1",image:t,image_width:20,image_height:15}])}}
                />
              </div>
            </div>
          </div>
        `}
      </div>
    `}_renderMapToolbar(){const e=this._getActiveFloor(),t=this._getFloors();return j`
      <div class="map-toolbar">
        <div class="config-row" style="margin-bottom:0;">
          <label>${this._t("panel.floor_name")}</label>
          <input
            type="text"
            .value=${e?.name||""}
            @change=${e=>this._updateFloor(this._activeFloorIdx,"name",e.target.value)}
            style="max-width:150px;"
          />
        </div>
        <div class="config-row" style="margin-bottom:0;">
          <label>${this._t("panel.floor_image")}</label>
          <input
            type="text"
            placeholder="/local/floorplan.png"
            .value=${e?.image||""}
            @change=${e=>this._updateFloor(this._activeFloorIdx,"image",e.target.value)}
            style="max-width:250px;"
          />
        </div>
        ${this._calibrating?j`
          ${this._calibrationPoints.length>=2?j`
            <input
              type="number"
              step="0.1"
              placeholder="${this._t("panel.calibrate_distance")}"
              style="width:120px;padding:6px 10px;border:1px solid var(--divider-color);border-radius:6px;font-size:12px;"
              @change=${e=>{this._calibrationMeters=parseFloat(e.target.value)||0}}
            />
            <button class="btn btn-small btn-primary" @click=${this._applyCalibration}>${this._t("panel.calibrate_apply")}</button>
          `:j`
            <span style="font-size:12px;color:var(--text-secondary);">${this._t("panel.calibrate_help")}</span>
          `}
          <button class="btn btn-small btn-secondary" @click=${this._cancelCalibration}>${this._t("panel.calibrate_cancel")}</button>
        `:j`
          <button class="btn btn-small btn-secondary" @click=${this._startCalibration}>${this._t("panel.calibrate")}</button>
        `}
        <div class="config-row" style="margin-bottom:0;">
          <label>${this._t("panel.width_m")}</label>
          <input type="number" step="0.1" .value=${String(e?.image_width||"")} @change=${e=>this._updateFloor(this._activeFloorIdx,"image_width",parseFloat(e.target.value))} style="width:80px;" />
        </div>
        <div class="config-row" style="margin-bottom:0;">
          <label>${this._t("panel.height_m")}</label>
          <input type="number" step="0.1" .value=${String(e?.image_height||"")} @change=${e=>this._updateFloor(this._activeFloorIdx,"image_height",parseFloat(e.target.value))} style="width:80px;" />
        </div>
        <button class="btn btn-small btn-secondary" @click=${this._addFloor}>
          ${this._t("panel.add_floor")}
        </button>
        ${t.length>1?j`
          <button class="btn btn-small btn-danger" @click=${()=>this._removeFloor(this._activeFloorIdx)}>
            ${this._t("panel.remove_floor")}
          </button>
        `:N}
      </div>
    `}_renderProxyToolbar(){return j`
      <div class="map-toolbar">
        <button class="btn btn-small btn-secondary" @click=${this._autoPlaceProxies}>
          ${this._t("panel.auto_place")}
        </button>
        <span style="font-size:11px;color:var(--text-secondary);">${this._t("panel.auto_place_help")}</span>
      </div>
    `}_renderZoneToolbar(){return j`
      <div class="map-toolbar">
        ${this._drawingZone?j`
          ${"polygon"===this._drawingMode?j`
            <button class="btn btn-small btn-primary" @click=${()=>this._finishZone()}>
              ${this._t("panel.zone_finish")} (${this._drawingPoints.length} pts)
            </button>
          `:j`
            <span style="font-size:12px;color:var(--text-secondary);">
              ${this._rectStart?this._t("panel.zone_finish"):this._t("panel.calibrate_help")}
            </span>
          `}
          <button class="btn btn-small btn-secondary" @click=${this._cancelDrawing}>
            ${this._t("panel.zone_cancel")}
          </button>
        `:j`
          <button class="btn btn-small btn-primary" @click=${()=>this._startDrawingZone("rectangle")}>
            ${this._t("panel.zone_draw_rectangle")}
          </button>
          <button class="btn btn-small btn-secondary" @click=${()=>this._startDrawingZone("polygon")}>
            ${this._t("panel.zone_draw_polygon")}
          </button>
          <span style="font-size:11px;color:var(--text-secondary);">${this._t("panel.zone_edit")}</span>
        `}
      </div>
    `}_renderZoneEditPanel(){const e=this._config.zones||[],t=e[this._editingZoneIdx];if(!t)return N;const i=this._editingZoneIdx;return j`
      <div class="zone-edit-panel">
        <h4>${this._t("panel.zone_editing")}: ${t.name||`Zone ${i+1}`}</h4>
        <div class="zone-edit-row">
          <label>${this._t("panel.zone_name")}</label>
          <input type="text" .value=${t.name||""} @change=${t=>{const o=[...e];o[i]={...o[i],name:t.target.value},this._updateConfig("zones",o)}} />
        </div>
        <div class="zone-edit-row">
          <label>${this._t("panel.zone_color")}</label>
          <input type="color" .value=${t.color||ue[0]} @input=${t=>{const o=[...e];o[i]={...o[i],color:t.target.value},this._updateConfig("zones",o)}} />
          <label>${this._t("panel.zone_border_color")}</label>
          <input type="color" .value=${t.border_color||t.color||ue[0]} @input=${t=>{const o=[...e];o[i]={...o[i],border_color:t.target.value},this._updateConfig("zones",o)}} />
        </div>
        <div class="zone-edit-row">
          <label>${this._t("panel.zone_opacity")}</label>
          <input type="range" min="0.05" max="0.8" step="0.05" .value=${String(t.opacity||.3)} @input=${t=>{const o=[...e];o[i]={...o[i],opacity:parseFloat(t.target.value)},this._updateConfig("zones",o)}} />
          <span style="font-size:11px;color:var(--text-secondary);min-width:30px;">${Math.round(100*(t.opacity||.3))}%</span>
        </div>
        <div class="zone-edit-row">
          <label>${this._t("panel.zone_show_label")}</label>
          <input type="checkbox" ?checked=${!1!==t.show_label} @change=${t=>{const o=[...e];o[i]={...o[i],show_label:t.target.checked},this._updateConfig("zones",o)}} />
        </div>
        <div style="display:flex;gap:8px;margin-top:8px;">
          <button class="btn btn-small btn-primary" @click=${()=>{this._editingZoneIdx=null}}>
            ${this._t("panel.zone_done_editing")}
          </button>
          <button class="btn btn-small btn-danger" @click=${()=>this._removeZone(i)}>
            ${this._t("panel.remove_zone")}
          </button>
        </div>
      </div>
    `}_renderProxyMarkers(){const e=this._config.proxies||[],t=this._getActiveFloor();return e.map((e,i)=>e.x||e.y?t&&e.floor_id&&e.floor_id!==t.id?N:j`
        <div
          class="proxy-marker"
          style="left: ${e.x}%; top: ${e.y}%;"
          @mousedown=${e=>{e.preventDefault(),this._draggingProxy=i}}
          title="${e.name||e.entity_id}\n${e.entity_id}\nPosition: ${e.x.toFixed(1)}%, ${e.y.toFixed(1)}%"
        >${i+1}</div>
        <div class="proxy-label" style="left: ${e.x}%; top: ${e.y+2}%;">
          ${e.name||e.entity_id.replace(/^.*\./,"").replace(/_/g," ")}
        </div>
      `:N)}_renderZoneOverlays(){const e=this._config.zones||[],t="zones"===this._activeTab,i=this._getActiveFloor();return e.map((e,o)=>{if(!e.points||e.points.length<3)return N;if(i&&e.floor_id&&e.floor_id!==i.id)return N;const a=e.points.map(e=>`${e.x}%,${e.y}%`).join(" "),n=e.points.reduce((e,t)=>e+t.x,0)/e.points.length,s=e.points.reduce((e,t)=>e+t.y,0)/e.points.length,r=this._editingZoneIdx===o,l=e.opacity||.3,c=r?Math.min(l+.2,.8):l;return j`
        <svg class="zone-polygon ${t?"clickable":""}" viewBox="0 0 100 100" preserveAspectRatio="none">
          <polygon
            points=${a}
            fill="${e.color||ue[0]}"
            fill-opacity="${c}"
            stroke="${r?"#fff":e.border_color||e.color||ue[0]}"
            stroke-width="${r?"0.5":"0.3"}"
            stroke-dasharray="${r?"1,0.5":"none"}"
          />
        </svg>
        ${!1!==e.show_label?j`
          <div class="zone-label-overlay" style="left: ${n}%; top: ${s}%;">
            ${e.name}
          </div>
        `:N}
      `})}_renderDrawingPoints(){return this._drawingZone&&"polygon"===this._drawingMode?j`
      ${this._drawingPoints.map(e=>j`
        <div class="draw-point" style="left: ${e.x}%; top: ${e.y}%;"></div>
      `)}
      ${this._drawingPoints.length>=2?j`
        <svg class="zone-polygon" viewBox="0 0 100 100" preserveAspectRatio="none">
          ${this._drawingPoints.map((e,t)=>{if(0===t)return N;const i=this._drawingPoints[t-1];return j`<line x1="${i.x}" y1="${i.y}" x2="${e.x}" y2="${e.y}" stroke="#FF5722" stroke-width="0.3" stroke-dasharray="1,0.5" />`})}
        </svg>
      `:N}
    `:N}_renderRectPreview(){if(!this._drawingZone||"rectangle"!==this._drawingMode||!this._rectStart)return N;const e=j`<div class="draw-point" style="left: ${this._rectStart.x}%; top: ${this._rectStart.y}%;"></div>`;if(!this._rectPreview)return e;const t=this._rectStart,i=this._rectPreview,o=Math.min(t.x,i.x),a=Math.min(t.y,i.y),n=Math.max(t.x,i.x),s=Math.max(t.y,i.y);return j`
      ${e}
      <svg class="rect-preview" viewBox="0 0 100 100" preserveAspectRatio="none">
        <rect
          x="${o}" y="${a}"
          width="${n-o}" height="${s-a}"
          fill="rgba(255, 87, 34, 0.15)"
          stroke="#FF5722"
          stroke-width="0.3"
          stroke-dasharray="1,0.5"
        />
      </svg>
    `}_renderCalibrationOverlay(){return this._calibrating&&0!==this._calibrationPoints.length?j`
      ${this._calibrationPoints.map(e=>j`
        <div class="cal-point" style="left: ${e.x}%; top: ${e.y}%;"></div>
      `)}
      ${this._calibrationPoints.length>=2?j`
        <svg class="cal-line" viewBox="0 0 100 100" preserveAspectRatio="none">
          <line
            x1="${this._calibrationPoints[0].x}" y1="${this._calibrationPoints[0].y}"
            x2="${this._calibrationPoints[1].x}" y2="${this._calibrationPoints[1].y}"
            stroke="#FF9800" stroke-width="0.3" stroke-dasharray="1,1"
          />
        </svg>
      `:N}
    `:N}_renderSettingsPanel(){return j`
      <div class="config-panel">
        <div class="config-section">
          <h3>${this._t("panel.tab_settings")}</h3>
          <div class="config-row">
            <label>${this._t("panel.card_title")}</label>
            <input type="text" .value=${this._config.card_title||""} @change=${e=>this._updateConfig("card_title",e.target.value)} />
          </div>
          <div class="config-row">
            <label>${this._t("panel.floor_display")}</label>
            <select @change=${e=>this._updateConfig("floor_display_mode",e.target.value)}>
              <option value="tabs" ?selected=${"stacked"!==this._config.floor_display_mode}>${this._t("panel.floor_tabs")}</option>
              <option value="stacked" ?selected=${"stacked"===this._config.floor_display_mode}>${this._t("panel.floor_stacked")}</option>
            </select>
          </div>
          <div class="config-row">
            <label>${this._t("panel.theme")}</label>
            <select @change=${e=>this._updateConfig("theme_mode",e.target.value)}>
              <option value="auto" ?selected=${"dark"!==this._config.theme_mode&&"light"!==this._config.theme_mode}>${this._t("panel.theme_auto")}</option>
              <option value="dark" ?selected=${"dark"===this._config.theme_mode}>${this._t("panel.theme_dark")}</option>
              <option value="light" ?selected=${"light"===this._config.theme_mode}>${this._t("panel.theme_light")}</option>
            </select>
          </div>
          <div class="config-row">
            <label>${this._t("panel.show_proxies")}</label>
            <input type="checkbox" ?checked=${!1!==this._config.show_proxies} @change=${e=>this._updateConfig("show_proxies",e.target.checked)} />
          </div>
          <div class="config-row">
            <label>${this._t("panel.show_zones")}</label>
            <input type="checkbox" ?checked=${!1!==this._config.show_zones} @change=${e=>this._updateConfig("show_zones",e.target.checked)} />
          </div>
          <div class="config-row">
            <label>${this._t("panel.show_zone_labels")}</label>
            <input type="checkbox" ?checked=${!1!==this._config.show_zone_labels} @change=${e=>this._updateConfig("show_zone_labels",e.target.checked)} />
          </div>
        </div>

        <div class="config-section">
          <h3>${this._t("panel.history_enabled")}</h3>
          <div class="config-row">
            <label>${this._t("panel.history_enabled")}</label>
            <input type="checkbox" ?checked=${!1!==this._config.history_enabled} @change=${e=>this._updateConfig("history_enabled",e.target.checked)} />
          </div>
          <div class="config-row">
            <label>${this._t("panel.history_retention")}</label>
            <input type="number" min="1" max="1440" .value=${String(this._config.history_retention||60)} @change=${e=>this._updateConfig("history_retention",parseInt(e.target.value))} />
          </div>
          <div class="config-row">
            <label>${this._t("panel.update_interval")}</label>
            <input type="number" min="1" max="60" .value=${String(this._config.update_interval||2)} @change=${e=>this._updateConfig("update_interval",parseInt(e.target.value))} />
          </div>
        </div>

        <!-- Proxy list -->
        <div class="config-section">
          <h3>${this._t("panel.tab_proxies")} (${(this._config.proxies||[]).length})</h3>
          <div class="item-list">
            ${(this._config.proxies||[]).map((e,t)=>j`
              <div class="item-card">
                <div class="item-color" style="background: #2196F3;"></div>
                <div class="item-info">
                  <div class="item-name">${e.name||e.entity_id}</div>
                  <div class="item-detail">${e.entity_id} · ${e.x>0?this._t("panel.placed"):this._t("panel.not_placed")}</div>
                </div>
                <input type="text" placeholder="${this._t("panel.proxy_name")}" .value=${e.name||""} @change=${e=>{const i=[...this._config.proxies||[]];i[t]={...i[t],name:e.target.value},this._updateConfig("proxies",i)}} style="width:120px;padding:4px 8px;border:1px solid var(--divider-color);border-radius:6px;font-size:12px;" />
                <button class="btn btn-danger btn-small" @click=${()=>this._removeProxy(t)}>${this._t("panel.remove")}</button>
              </div>
            `)}
          </div>
        </div>

        <!-- Device list -->
        <div class="config-section">
          <h3>${this._t("panel.tab_devices")} (${(this._config.tracked_devices||[]).length})</h3>
          <div class="item-list">
            ${(this._config.tracked_devices||[]).map((e,t)=>j`
              <div class="item-card">
                <div class="item-color" style="background: ${e.color||ve[0]};"></div>
                <div class="item-info">
                  <div class="item-name">${e.name||e.entity_prefix}</div>
                  <div class="item-detail">${e.entity_prefix}</div>
                </div>
                <input type="text" placeholder="${this._t("panel.device_name")}" .value=${e.name||""} @change=${e=>{const i=[...this._config.tracked_devices||[]];i[t]={...i[t],name:e.target.value},this._updateConfig("tracked_devices",i)}} style="width:100px;padding:4px 8px;border:1px solid var(--divider-color);border-radius:6px;font-size:12px;" />
                <input type="color" .value=${e.color||ve[0]} @change=${e=>{const i=[...this._config.tracked_devices||[]];i[t]={...i[t],color:e.target.value},this._updateConfig("tracked_devices",i)}} />
                <button class="btn btn-danger btn-small" @click=${()=>this._removeDevice(t)}>${this._t("panel.remove")}</button>
              </div>
            `)}
          </div>
        </div>

        <!-- Zone list -->
        <div class="config-section">
          <h3>${this._t("panel.tab_zones")} (${(this._config.zones||[]).length})</h3>
          <div class="item-list">
            ${(this._config.zones||[]).map((e,t)=>j`
              <div class="item-card">
                <div class="item-color" style="background: ${e.color||ue[0]};"></div>
                <div class="item-info">
                  <div class="item-name">${e.name||`Zone ${t+1}`}</div>
                  <div class="item-detail">${e.points?.length||0} points</div>
                </div>
                <input type="text" placeholder="${this._t("panel.zone_name")}" .value=${e.name||""} @change=${e=>{const i=[...this._config.zones||[]];i[t]={...i[t],name:e.target.value},this._updateConfig("zones",i)}} style="width:100px;padding:4px 8px;border:1px solid var(--divider-color);border-radius:6px;font-size:12px;" />
                <input type="color" .value=${e.color||ue[0]} @change=${e=>{const i=[...this._config.zones||[]];i[t]={...i[t],color:e.target.value},this._updateConfig("zones",i)}} />
                <button class="btn btn-danger btn-small" @click=${()=>this._removeZone(t)}>${this._t("panel.remove")}</button>
              </div>
            `)}
          </div>
        </div>
      </div>
    `}};e([he({attribute:!1})],Ze.prototype,"hass",void 0),e([he({type:Boolean,reflect:!0})],Ze.prototype,"narrow",void 0),e([he({attribute:!1})],Ze.prototype,"panel",void 0),e([_e()],Ze.prototype,"_config",void 0),e([_e()],Ze.prototype,"_activeTab",void 0),e([_e()],Ze.prototype,"_saving",void 0),e([_e()],Ze.prototype,"_saveMessage",void 0),e([_e()],Ze.prototype,"_loaded",void 0),e([_e()],Ze.prototype,"_sidebarFilter",void 0),e([_e()],Ze.prototype,"_sidebarCategory",void 0),e([_e()],Ze.prototype,"_activeFloorIdx",void 0),e([_e()],Ze.prototype,"_placingEntity",void 0),e([_e()],Ze.prototype,"_placingMode",void 0),e([_e()],Ze.prototype,"_drawingZone",void 0),e([_e()],Ze.prototype,"_drawingPoints",void 0),e([_e()],Ze.prototype,"_drawingMode",void 0),e([_e()],Ze.prototype,"_rectStart",void 0),e([_e()],Ze.prototype,"_rectPreview",void 0),e([_e()],Ze.prototype,"_calibrating",void 0),e([_e()],Ze.prototype,"_calibrationPoints",void 0),e([_e()],Ze.prototype,"_calibrationMeters",void 0),e([_e()],Ze.prototype,"_draggingProxy",void 0),e([_e()],Ze.prototype,"_mapImageLoaded",void 0),e([_e()],Ze.prototype,"_editingZoneIdx",void 0),Ze=e([ce("ble-livemap-panel")],Ze),window.customCards=window.customCards||[],window.customCards.push({type:me,name:"BLE LiveMap",description:"Real-time BLE device position tracking on your floor plan",preview:!0,documentationURL:"https://github.com/ToFinToFun/ha-ble-livemap"}),console.info(`%c BLE-LIVEMAP %c v${be} `,"color: white; background: #4FC3F7; font-weight: bold; padding: 2px 6px; border-radius: 4px 0 0 4px;","color: #4FC3F7; background: #263238; font-weight: bold; padding: 2px 6px; border-radius: 0 4px 4px 0;");let Be=class extends re{constructor(){super(...arguments),this._devices=[],this._activeFloor=null,this._isFullscreen=!1,this._imageLoaded={},this._imageError={},this._showDevicePanel=!1,this._runtimeShowProxies=null,this._runtimeShowZones=null,this._runtimeShowZoneLabels=null,this._showSetupDialog=!1,this._canvases=new Map,this._images=new Map,this._historyStore=null,this._animationFrame=null,this._updateTimer=null,this._previousPositions=new Map,this._lang="en",this._resizeObserver=null}static getConfigElement(){return document.createElement(ye)}static getStubConfig(){return{type:`custom:${me}`,floorplan_image:"",tracked_devices:[],proxies:[]}}setConfig(e){this._config={...ge,...e},this._config.history_enabled&&(this._historyStore=new De(this._config.history_retention||60,this._config.history_trail_length||50));const t=this._getFloors();t.length>0&&!this._activeFloor&&(this._activeFloor=e.active_floor||t[0].id)}connectedCallback(){super.connectedCallback(),this._startUpdateLoop()}disconnectedCallback(){super.disconnectedCallback(),this._stopUpdateLoop(),this._stopRenderLoop(),this._resizeObserver?.disconnect()}firstUpdated(e){super.firstUpdated(e),this._setupResizeObserver(),this._startRenderLoop()}updated(e){super.updated(e),e.has("hass")&&this.hass&&(this._lang=this.hass.selectedLanguage||this.hass.language||"en"),this._updateCanvasRefs()}getCardSize(){return 6}_startUpdateLoop(){const e=1e3*(this._config?.update_interval||2);this._updateTimer=window.setInterval(()=>this._updateDevices(),e),this._updateDevices()}_stopUpdateLoop(){this._updateTimer&&(clearInterval(this._updateTimer),this._updateTimer=null)}_updateDevices(){if(!this.hass||!this._config?.tracked_devices)return;const e=[],t=this._getAllProxies();for(const i of this._config.tracked_devices){const o=this._getDeviceDistances(i,t);let a=null;if(o.length>=1){const e=new Map;for(const i of o){const o=t.find(e=>e.entity_id===i.proxy_entity_id);o&&e.set(i.proxy_entity_id,{x:o.x,y:o.y})}if(e.size>=1){const t=this._getFloors()[0],n=xe(e,o,0,0,t?.image_width||20,t?.image_height||15);if(n){const e=i.entity_prefix||"",t=this._previousPositions.get(e),o=$e(n,t?{x:t.x,y:t.y,accuracy:t.accuracy,confidence:t.confidence}:null,.3);o&&(a={x:o.x,y:o.y,accuracy:o.accuracy,confidence:o.confidence,timestamp:Date.now()},this._previousPositions.set(e,a))}}}let n=null;if(o.length>0){const e=o.reduce((e,t)=>e.distance<t.distance?e:t),i=t.find(t=>t.entity_id===e.proxy_entity_id);n=i?.name||i?.entity_id||null}const s=i.entity_prefix||i.bermuda_device_id||"";let r=this._historyStore?.getTrail(s)||[];a&&this._historyStore&&(this._historyStore.addPoint(s,{x:a.x,y:a.y,timestamp:a.timestamp}),r=this._historyStore.getTrail(s)),e.push({device_id:s,name:i.name,position:a,history:r,distances:o,nearest_proxy:n,area:null,last_seen:a?Date.now():0,config:i})}this._devices=e,function(e){const t=new Set(e);for(const e of we.keys())t.has(e)||we.delete(e)}(e.map(e=>e.device_id))}_getDeviceDistances(e,t){if(!this.hass)return[];const i=e.entity_prefix,o=[];if(i)for(const e of t){const t=e.entity_id.replace(/^.*\./,"").replace(/_proxy$/,""),a=[`${i}_${t}_distance`,`${i}_distance_${t}`];for(const t of a){const i=this.hass.states[t];if(i&&!isNaN(parseFloat(i.state))){const t=parseFloat(i.state),a=i.attributes||{};o.push({proxy_entity_id:e.entity_id,distance:t,rssi:a.rssi||-80,timestamp:new Date(i.last_updated).getTime()});break}}}if(0===o.length&&i){const e=`${i}_distance`,a=this.hass.states[e];if(a){const e=a.attributes||{};if(e.scanners)for(const[i,a]of Object.entries(e.scanners)){const e=t.find(e=>e.entity_id===i||e.name===a?.name);e&&a?.distance&&o.push({proxy_entity_id:e.entity_id,distance:a.distance,rssi:a.rssi||-80,timestamp:Date.now()})}}}if(0===o.length&&i){const e=i.replace("sensor.bermuda_","device_tracker.bermuda_"),a=this.hass.states[e];if(a?.attributes?.scanners)for(const[e,i]of Object.entries(a.attributes.scanners)){const a=t.find(t=>t.entity_id===e);a&&i?.distance&&o.push({proxy_entity_id:a.entity_id,distance:i.distance,rssi:i.rssi||-80,timestamp:Date.now()})}}return o}_findEntity(e,t){if(!this.hass||!e.entity_prefix)return null;const i=`${e.entity_prefix}_${t}`;return this.hass.states[i]?i:null}_getAllProxies(){if(!this._config)return[];const e=this._config.proxies||[],t=[];for(const e of this._getFloors())e.proxies&&t.push(...e.proxies);return[...e,...t]}_getProxiesForFloor(e){if(!this._config)return[];const t=(this._config.proxies||[]).filter(t=>!t.floor_id||t.floor_id===e),i=this._getFloors().find(t=>t.id===e);return[...t,...i?.proxies||[]]}_getZonesForFloor(e){return(this._config.zones||[]).filter(t=>!t.floor_id||t.floor_id===e)}_getFloors(){const e=this._config?.floors||[];return 0===e.length&&this._config?.floorplan_image?[{id:"default",name:"Floor 1",image:this._config.floorplan_image,image_width:20,image_height:15}]:e}_getActiveFloor(){const e=this._getFloors();return e.find(e=>e.id===this._activeFloor)||e[0]||null}_getFloorplanImage(){const e=this._getActiveFloor();return e?.image||this._config?.floorplan_image||""}_isStackedMode(){return"stacked"===this._config?.floor_display_mode&&this._getFloors().length>1}_updateCanvasRefs(){const e=this.shadowRoot;if(!e)return;const t=e.querySelectorAll("canvas[data-floor-id]"),i=e.querySelectorAll("img[data-floor-id]");t.forEach(e=>{const t=e.dataset.floorId||"";this._canvases.set(t,e)}),i.forEach(e=>{const t=e.dataset.floorId||"";this._images.set(t,e)})}_setupResizeObserver(){this._resizeObserver=new ResizeObserver(()=>{this._resizeAllCanvases()});const e=this.shadowRoot?.querySelectorAll(".map-container");e?.forEach(e=>{this._resizeObserver.observe(e)})}_resizeAllCanvases(){for(const[e,t]of this._canvases.entries()){const i=this._images.get(e);if(!t||!i)continue;const o=t.parentElement;if(!o)continue;const a=o.clientWidth;if(0===a||!i.naturalWidth||!i.naturalHeight)continue;const n=a,s=a/(i.naturalWidth/i.naturalHeight),r=window.devicePixelRatio||1;t.width=n*r,t.height=s*r,t.style.width=`${n}px`,t.style.height=`${s}px`}}_startRenderLoop(){const e=()=>{this._renderAllCanvases(),this._animationFrame=requestAnimationFrame(e)};this._animationFrame=requestAnimationFrame(e)}_stopRenderLoop(){this._animationFrame&&(cancelAnimationFrame(this._animationFrame),this._animationFrame=null)}_renderAllCanvases(){const e=this._isDarkMode(),t={...this._config,show_proxies:this._runtimeShowProxies??this._config.show_proxies,show_zones:this._runtimeShowZones??this._config.show_zones,show_zone_labels:this._runtimeShowZoneLabels??this._config.show_zone_labels};if(this._isStackedMode())for(const i of this._getFloors())this._renderFloorCanvas(i.id,t,e);else{const i=this._getActiveFloor();i&&this._renderFloorCanvas(i.id,t,e)}}_renderFloorCanvas(e,t,i){const o=this._canvases.get(e);if(!o)return;const a=o.getContext("2d");if(!a)return;const n=window.devicePixelRatio||1,s=o.width/n,r=o.height/n;if(0===s||0===r)return;const l=this._getProxiesForFloor(e),c=this._getZonesForFloor(e);ze({ctx:a,width:s,height:r,dpr:n,isDark:i},this._devices,l,c,t,e)}_isDarkMode(){return"dark"===this._config?.theme_mode||"light"!==this._config?.theme_mode&&(this.hass?.themes?.darkMode??!1)}_handleImageLoad(e){this._imageLoaded={...this._imageLoaded,[e]:!0},this._imageError={...this._imageError,[e]:!1},requestAnimationFrame(()=>{this._updateCanvasRefs(),this._resizeAllCanvases(),this._resizeObserver?.disconnect(),this._setupResizeObserver()})}_handleImageError(e){this._imageError={...this._imageError,[e]:!0},this._imageLoaded={...this._imageLoaded,[e]:!1}}_handleFloorChange(e){const t=e.target;this._activeFloor=t.value}_toggleFullscreen(){this._isFullscreen=!this._isFullscreen,this._isFullscreen?this.requestFullscreen?.():document.exitFullscreen?.()}_toggleDevicePanel(){this._showDevicePanel=!this._showDevicePanel}_toggleProxies(){const e=this._runtimeShowProxies??this._config.show_proxies??!0;this._runtimeShowProxies=!e}_toggleZones(){const e=this._runtimeShowZones??this._config.show_zones??!0;this._runtimeShowZones=!e}_toggleZoneLabels(){const e=this._runtimeShowZoneLabels??this._config.show_zone_labels??!0;this._runtimeShowZoneLabels=!e}_openSetupDialog(){this._showSetupDialog=!0,this.updateComplete.then(()=>{const e=this.shadowRoot?.querySelector("ble-livemap-card-editor");e&&e.setConfig&&e.setConfig(this._config)})}_closeSetupDialog(){this._showSetupDialog=!1}_handleSetupConfigChanged(e){if(e.detail?.config){this._config={...e.detail.config};const t=new CustomEvent("config-changed",{detail:{config:this._config},bubbles:!0,composed:!0});this.dispatchEvent(t),this.setConfig(this._config)}}_renderSetupDialog(){if(!this._showSetupDialog)return N;return j`
      <div class="setup-overlay" @click=${e=>{e.target.classList.contains("setup-overlay")&&this._closeSetupDialog()}}>
        <div class="setup-dialog">
          <div class="setup-header">
            <h2>${(e=>Te(e,this._lang))("editor.title")}</h2>
            <button class="setup-close" @click=${this._closeSetupDialog}>
              <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>
          <div class="setup-body" id="setup-body">
            <ble-livemap-card-editor
              .hass=${this.hass}
              @config-changed=${this._handleSetupConfigChanged}
            ></ble-livemap-card-editor>
          </div>
        </div>
      </div>
    `}_renderFloorMap(e){const t=this._imageLoaded[e.id]||!1,i=this._imageError[e.id]||!1;return j`
      <div class="map-container" data-floor-id="${e.id}">
        ${this._isStackedMode()?j`<div class="floor-label">${e.name}</div>`:N}
        <img
          data-floor-id="${e.id}"
          src=${e.image}
          @load=${()=>this._handleImageLoad(e.id)}
          @error=${()=>this._handleImageError(e.id)}
          alt="${e.name}"
          crossorigin="anonymous"
        />
        ${t?j`<canvas data-floor-id="${e.id}"></canvas>`:N}
        ${i?j`<div class="empty-state"><p>Failed to load: ${e.image}</p></div>`:N}
      </div>
    `}static get styles(){return s`
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

      .maps-wrapper {
        display: flex;
        flex-direction: column;
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

      .floor-label {
        position: absolute;
        top: 8px;
        left: 12px;
        z-index: 5;
        background: rgba(0,0,0,0.5);
        color: white;
        padding: 3px 10px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.3px;
      }

      .floor-divider {
        height: 2px;
        background: var(--divider-color, rgba(0,0,0,0.08));
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

      /* Setup Dialog */
      .setup-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.6);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(4px);
        animation: fadeIn 0.2s ease;
      }

      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @keyframes slideUp {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }

      .setup-dialog {
        background: var(--card-bg, #fff);
        border-radius: 16px;
        width: 95vw;
        max-width: 1200px;
        height: 90vh;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        box-shadow: 0 24px 80px rgba(0, 0, 0, 0.4);
        animation: slideUp 0.25s ease;
      }

      .setup-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 24px;
        border-bottom: 1px solid var(--divider-color, rgba(0,0,0,0.08));
        flex-shrink: 0;
      }

      .setup-header h2 {
        margin: 0;
        font-size: 20px;
        font-weight: 600;
        color: var(--text-primary);
      }

      .setup-close {
        background: none;
        border: none;
        cursor: pointer;
        padding: 8px;
        border-radius: 50%;
        color: var(--text-secondary);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s, color 0.2s;
      }

      .setup-close:hover {
        background: var(--divider-color, rgba(0,0,0,0.08));
        color: var(--text-primary);
      }

      .setup-body {
        flex: 1;
        overflow-y: auto;
        padding: 0;
      }

      .setup-body ble-livemap-card-editor {
        display: block;
        width: 100%;
      }
    `}render(){if(!this._config)return N;const e=this._getFloors(),t=e.length>1,i=this._isStackedMode(),o=this._config.card_title||"BLE LiveMap",a=e=>Te(e,this._lang),n=e.some(e=>e.image);return j`
      <ha-card>
        <!-- Header -->
        <div class="card-header">
          <div class="card-title">
            <span class="dot"></span>
            ${o}
          </div>
          <div class="header-actions">
            ${t&&!i?j`
                  <select class="floor-select" @change=${this._handleFloorChange}>
                    ${e.map(e=>j`
                        <option value=${e.id} ?selected=${e.id===this._activeFloor}>
                          ${e.name}
                        </option>
                      `)}
                  </select>
                `:N}
            <!-- Toggle proxies -->
            <button
              class="header-btn ${this._runtimeShowProxies??this._config.show_proxies??1?"":"off"}"
              @click=${this._toggleProxies}
              title="${a("card.toggle_proxies")}"
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
                    title="${a("card.toggle_zones")}"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z"/>
                    </svg>
                  </button>
                `:N}
            <!-- Setup button -->
            <button class="header-btn" @click=${this._openSetupDialog} title="${a("common.configure")}">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.49.49 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 00-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1115.6 12 3.6 3.6 0 0112 15.6z"/>
              </svg>
            </button>
            <button class="header-btn" @click=${this._toggleDevicePanel} title="Devices">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            </button>
            ${this._config.fullscreen_enabled?j`
                  <button class="header-btn" @click=${this._toggleFullscreen} title="${a("card.fullscreen")}">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
                    </svg>
                  </button>
                `:N}
          </div>
        </div>

        <!-- Maps -->
        ${n?j`
              <div class="maps-wrapper">
                ${i?e.map((e,t)=>j`
                        ${t>0?j`<div class="floor-divider"></div>`:N}
                        ${this._renderFloorMap(e)}
                      `):this._getActiveFloor()?this._renderFloorMap(this._getActiveFloor()):N}
              </div>
            `:j`
              <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zM5 15h14v3H5z"/>
                </svg>
                <p>${a("common.no_floorplan")}</p>
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
                    ${e.area||e.nearest_proxy||a("common.unknown")}
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
              ${a("card.devices_tracked")}
            </div>
            <div class="status-item">
              <span class="count">${this._getAllProxies().length}</span>
              ${a("card.proxies_active")}
            </div>
          </div>
          <div>v${be}</div>
        </div>
        <!-- Setup Dialog -->
        ${this._renderSetupDialog()}
      </ha-card>
    `}};e([he({attribute:!1})],Be.prototype,"hass",void 0),e([_e()],Be.prototype,"_config",void 0),e([_e()],Be.prototype,"_devices",void 0),e([_e()],Be.prototype,"_activeFloor",void 0),e([_e()],Be.prototype,"_isFullscreen",void 0),e([_e()],Be.prototype,"_imageLoaded",void 0),e([_e()],Be.prototype,"_imageError",void 0),e([_e()],Be.prototype,"_showDevicePanel",void 0),e([_e()],Be.prototype,"_runtimeShowProxies",void 0),e([_e()],Be.prototype,"_runtimeShowZones",void 0),e([_e()],Be.prototype,"_runtimeShowZoneLabels",void 0),e([_e()],Be.prototype,"_showSetupDialog",void 0),Be=e([ce(me)],Be);export{Be as BLELivemapCard};
