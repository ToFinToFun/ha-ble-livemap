function t(t,e,i,o){var s,n=arguments.length,r=n<3?e:null===o?o=Object.getOwnPropertyDescriptor(e,i):o;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(t,e,i,o);else for(var a=t.length-1;a>=0;a--)(s=t[a])&&(r=(n<3?s(r):n>3?s(e,i,r):s(e,i))||r);return n>3&&r&&Object.defineProperty(e,i,r),r}"function"==typeof SuppressedError&&SuppressedError;const e=globalThis,i=e.ShadowRoot&&(void 0===e.ShadyCSS||e.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,o=Symbol(),s=new WeakMap;let n=class{constructor(t,e,i){if(this._$cssResult$=!0,i!==o)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=t,this.t=e}get styleSheet(){let t=this.o;const e=this.t;if(i&&void 0===t){const i=void 0!==e&&1===e.length;i&&(t=s.get(e)),void 0===t&&((this.o=t=new CSSStyleSheet).replaceSync(this.cssText),i&&s.set(e,t))}return t}toString(){return this.cssText}};const r=(t,...e)=>{const i=1===t.length?t[0]:e.reduce((e,i,o)=>e+(t=>{if(!0===t._$cssResult$)return t.cssText;if("number"==typeof t)return t;throw Error("Value passed to 'css' function must be a 'css' function result: "+t+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(i)+t[o+1],t[0]);return new n(i,t,o)},a=i?t=>t:t=>t instanceof CSSStyleSheet?(t=>{let e="";for(const i of t.cssRules)e+=i.cssText;return(t=>new n("string"==typeof t?t:t+"",void 0,o))(e)})(t):t,{is:l,defineProperty:c,getOwnPropertyDescriptor:d,getOwnPropertyNames:h,getOwnPropertySymbols:p,getPrototypeOf:_}=Object,g=globalThis,u=g.trustedTypes,f=u?u.emptyScript:"",v=g.reactiveElementPolyfillSupport,m=(t,e)=>t,b={toAttribute(t,e){switch(e){case Boolean:t=t?f:null;break;case Object:case Array:t=null==t?t:JSON.stringify(t)}return t},fromAttribute(t,e){let i=t;switch(e){case Boolean:i=null!==t;break;case Number:i=null===t?null:Number(t);break;case Object:case Array:try{i=JSON.parse(t)}catch(t){i=null}}return i}},y=(t,e)=>!l(t,e),x={attribute:!0,type:String,converter:b,reflect:!1,useDefault:!1,hasChanged:y};Symbol.metadata??=Symbol("metadata"),g.litPropertyMetadata??=new WeakMap;let $=class extends HTMLElement{static addInitializer(t){this._$Ei(),(this.l??=[]).push(t)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(t,e=x){if(e.state&&(e.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(t)&&((e=Object.create(e)).wrapped=!0),this.elementProperties.set(t,e),!e.noAccessor){const i=Symbol(),o=this.getPropertyDescriptor(t,i,e);void 0!==o&&c(this.prototype,t,o)}}static getPropertyDescriptor(t,e,i){const{get:o,set:s}=d(this.prototype,t)??{get(){return this[e]},set(t){this[e]=t}};return{get:o,set(e){const n=o?.call(this);s?.call(this,e),this.requestUpdate(t,n,i)},configurable:!0,enumerable:!0}}static getPropertyOptions(t){return this.elementProperties.get(t)??x}static _$Ei(){if(this.hasOwnProperty(m("elementProperties")))return;const t=_(this);t.finalize(),void 0!==t.l&&(this.l=[...t.l]),this.elementProperties=new Map(t.elementProperties)}static finalize(){if(this.hasOwnProperty(m("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(m("properties"))){const t=this.properties,e=[...h(t),...p(t)];for(const i of e)this.createProperty(i,t[i])}const t=this[Symbol.metadata];if(null!==t){const e=litPropertyMetadata.get(t);if(void 0!==e)for(const[t,i]of e)this.elementProperties.set(t,i)}this._$Eh=new Map;for(const[t,e]of this.elementProperties){const i=this._$Eu(t,e);void 0!==i&&this._$Eh.set(i,t)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(t){const e=[];if(Array.isArray(t)){const i=new Set(t.flat(1/0).reverse());for(const t of i)e.unshift(a(t))}else void 0!==t&&e.push(a(t));return e}static _$Eu(t,e){const i=e.attribute;return!1===i?void 0:"string"==typeof i?i:"string"==typeof t?t.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(t=>this.enableUpdating=t),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(t=>t(this))}addController(t){(this._$EO??=new Set).add(t),void 0!==this.renderRoot&&this.isConnected&&t.hostConnected?.()}removeController(t){this._$EO?.delete(t)}_$E_(){const t=new Map,e=this.constructor.elementProperties;for(const i of e.keys())this.hasOwnProperty(i)&&(t.set(i,this[i]),delete this[i]);t.size>0&&(this._$Ep=t)}createRenderRoot(){const t=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return((t,o)=>{if(i)t.adoptedStyleSheets=o.map(t=>t instanceof CSSStyleSheet?t:t.styleSheet);else for(const i of o){const o=document.createElement("style"),s=e.litNonce;void 0!==s&&o.setAttribute("nonce",s),o.textContent=i.cssText,t.appendChild(o)}})(t,this.constructor.elementStyles),t}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(t=>t.hostConnected?.())}enableUpdating(t){}disconnectedCallback(){this._$EO?.forEach(t=>t.hostDisconnected?.())}attributeChangedCallback(t,e,i){this._$AK(t,i)}_$ET(t,e){const i=this.constructor.elementProperties.get(t),o=this.constructor._$Eu(t,i);if(void 0!==o&&!0===i.reflect){const s=(void 0!==i.converter?.toAttribute?i.converter:b).toAttribute(e,i.type);this._$Em=t,null==s?this.removeAttribute(o):this.setAttribute(o,s),this._$Em=null}}_$AK(t,e){const i=this.constructor,o=i._$Eh.get(t);if(void 0!==o&&this._$Em!==o){const t=i.getPropertyOptions(o),s="function"==typeof t.converter?{fromAttribute:t.converter}:void 0!==t.converter?.fromAttribute?t.converter:b;this._$Em=o;const n=s.fromAttribute(e,t.type);this[o]=n??this._$Ej?.get(o)??n,this._$Em=null}}requestUpdate(t,e,i,o=!1,s){if(void 0!==t){const n=this.constructor;if(!1===o&&(s=this[t]),i??=n.getPropertyOptions(t),!((i.hasChanged??y)(s,e)||i.useDefault&&i.reflect&&s===this._$Ej?.get(t)&&!this.hasAttribute(n._$Eu(t,i))))return;this.C(t,e,i)}!1===this.isUpdatePending&&(this._$ES=this._$EP())}C(t,e,{useDefault:i,reflect:o,wrapped:s},n){i&&!(this._$Ej??=new Map).has(t)&&(this._$Ej.set(t,n??e??this[t]),!0!==s||void 0!==n)||(this._$AL.has(t)||(this.hasUpdated||i||(e=void 0),this._$AL.set(t,e)),!0===o&&this._$Em!==t&&(this._$Eq??=new Set).add(t))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(t){Promise.reject(t)}const t=this.scheduleUpdate();return null!=t&&await t,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(const[t,e]of this._$Ep)this[t]=e;this._$Ep=void 0}const t=this.constructor.elementProperties;if(t.size>0)for(const[e,i]of t){const{wrapped:t}=i,o=this[e];!0!==t||this._$AL.has(e)||void 0===o||this.C(e,void 0,i,o)}}let t=!1;const e=this._$AL;try{t=this.shouldUpdate(e),t?(this.willUpdate(e),this._$EO?.forEach(t=>t.hostUpdate?.()),this.update(e)):this._$EM()}catch(e){throw t=!1,this._$EM(),e}t&&this._$AE(e)}willUpdate(t){}_$AE(t){this._$EO?.forEach(t=>t.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(t)),this.updated(t)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(t){return!0}update(t){this._$Eq&&=this._$Eq.forEach(t=>this._$ET(t,this[t])),this._$EM()}updated(t){}firstUpdated(t){}};$.elementStyles=[],$.shadowRootOptions={mode:"open"},$[m("elementProperties")]=new Map,$[m("finalized")]=new Map,v?.({ReactiveElement:$}),(g.reactiveElementVersions??=[]).push("2.1.2");const w=globalThis,k=t=>t,C=w.trustedTypes,A=C?C.createPolicy("lit-html",{createHTML:t=>t}):void 0,S="$lit$",z=`lit$${Math.random().toFixed(9).slice(2)}$`,P="?"+z,F=`<${P}>`,E=document,M=()=>E.createComment(""),D=t=>null===t||"object"!=typeof t&&"function"!=typeof t,T=Array.isArray,L="[ \t\n\f\r]",R=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,H=/-->/g,B=/>/g,U=RegExp(`>|${L}(?:([^\\s"'>=/]+)(${L}*=${L}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,"g"),I=/'/g,O=/"/g,Z=/^(?:script|style|textarea|title)$/i,N=(t=>(e,...i)=>({_$litType$:t,strings:e,values:i}))(1),V=Symbol.for("lit-noChange"),j=Symbol.for("lit-nothing"),q=new WeakMap,W=E.createTreeWalker(E,129);function K(t,e){if(!T(t)||!t.hasOwnProperty("raw"))throw Error("invalid template strings array");return void 0!==A?A.createHTML(e):e}const X=(t,e)=>{const i=t.length-1,o=[];let s,n=2===e?"<svg>":3===e?"<math>":"",r=R;for(let e=0;e<i;e++){const i=t[e];let a,l,c=-1,d=0;for(;d<i.length&&(r.lastIndex=d,l=r.exec(i),null!==l);)d=r.lastIndex,r===R?"!--"===l[1]?r=H:void 0!==l[1]?r=B:void 0!==l[2]?(Z.test(l[2])&&(s=RegExp("</"+l[2],"g")),r=U):void 0!==l[3]&&(r=U):r===U?">"===l[0]?(r=s??R,c=-1):void 0===l[1]?c=-2:(c=r.lastIndex-l[2].length,a=l[1],r=void 0===l[3]?U:'"'===l[3]?O:I):r===O||r===I?r=U:r===H||r===B?r=R:(r=U,s=void 0);const h=r===U&&t[e+1].startsWith("/>")?" ":"";n+=r===R?i+F:c>=0?(o.push(a),i.slice(0,c)+S+i.slice(c)+z+h):i+z+(-2===c?e:h)}return[K(t,n+(t[i]||"<?>")+(2===e?"</svg>":3===e?"</math>":"")),o]};class Y{constructor({strings:t,_$litType$:e},i){let o;this.parts=[];let s=0,n=0;const r=t.length-1,a=this.parts,[l,c]=X(t,e);if(this.el=Y.createElement(l,i),W.currentNode=this.el.content,2===e||3===e){const t=this.el.content.firstChild;t.replaceWith(...t.childNodes)}for(;null!==(o=W.nextNode())&&a.length<r;){if(1===o.nodeType){if(o.hasAttributes())for(const t of o.getAttributeNames())if(t.endsWith(S)){const e=c[n++],i=o.getAttribute(t).split(z),r=/([.?@])?(.*)/.exec(e);a.push({type:1,index:s,name:r[2],strings:i,ctor:"."===r[1]?et:"?"===r[1]?it:"@"===r[1]?ot:tt}),o.removeAttribute(t)}else t.startsWith(z)&&(a.push({type:6,index:s}),o.removeAttribute(t));if(Z.test(o.tagName)){const t=o.textContent.split(z),e=t.length-1;if(e>0){o.textContent=C?C.emptyScript:"";for(let i=0;i<e;i++)o.append(t[i],M()),W.nextNode(),a.push({type:2,index:++s});o.append(t[e],M())}}}else if(8===o.nodeType)if(o.data===P)a.push({type:2,index:s});else{let t=-1;for(;-1!==(t=o.data.indexOf(z,t+1));)a.push({type:7,index:s}),t+=z.length-1}s++}}static createElement(t,e){const i=E.createElement("template");return i.innerHTML=t,i}}function J(t,e,i=t,o){if(e===V)return e;let s=void 0!==o?i._$Co?.[o]:i._$Cl;const n=D(e)?void 0:e._$litDirective$;return s?.constructor!==n&&(s?._$AO?.(!1),void 0===n?s=void 0:(s=new n(t),s._$AT(t,i,o)),void 0!==o?(i._$Co??=[])[o]=s:i._$Cl=s),void 0!==s&&(e=J(t,s._$AS(t,e.values),s,o)),e}class G{constructor(t,e){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=e}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){const{el:{content:e},parts:i}=this._$AD,o=(t?.creationScope??E).importNode(e,!0);W.currentNode=o;let s=W.nextNode(),n=0,r=0,a=i[0];for(;void 0!==a;){if(n===a.index){let e;2===a.type?e=new Q(s,s.nextSibling,this,t):1===a.type?e=new a.ctor(s,a.name,a.strings,this,t):6===a.type&&(e=new st(s,this,t)),this._$AV.push(e),a=i[++r]}n!==a?.index&&(s=W.nextNode(),n++)}return W.currentNode=E,o}p(t){let e=0;for(const i of this._$AV)void 0!==i&&(void 0!==i.strings?(i._$AI(t,i,e),e+=i.strings.length-2):i._$AI(t[e])),e++}}class Q{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(t,e,i,o){this.type=2,this._$AH=j,this._$AN=void 0,this._$AA=t,this._$AB=e,this._$AM=i,this.options=o,this._$Cv=o?.isConnected??!0}get parentNode(){let t=this._$AA.parentNode;const e=this._$AM;return void 0!==e&&11===t?.nodeType&&(t=e.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,e=this){t=J(this,t,e),D(t)?t===j||null==t||""===t?(this._$AH!==j&&this._$AR(),this._$AH=j):t!==this._$AH&&t!==V&&this._(t):void 0!==t._$litType$?this.$(t):void 0!==t.nodeType?this.T(t):(t=>T(t)||"function"==typeof t?.[Symbol.iterator])(t)?this.k(t):this._(t)}O(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}T(t){this._$AH!==t&&(this._$AR(),this._$AH=this.O(t))}_(t){this._$AH!==j&&D(this._$AH)?this._$AA.nextSibling.data=t:this.T(E.createTextNode(t)),this._$AH=t}$(t){const{values:e,_$litType$:i}=t,o="number"==typeof i?this._$AC(t):(void 0===i.el&&(i.el=Y.createElement(K(i.h,i.h[0]),this.options)),i);if(this._$AH?._$AD===o)this._$AH.p(e);else{const t=new G(o,this),i=t.u(this.options);t.p(e),this.T(i),this._$AH=t}}_$AC(t){let e=q.get(t.strings);return void 0===e&&q.set(t.strings,e=new Y(t)),e}k(t){T(this._$AH)||(this._$AH=[],this._$AR());const e=this._$AH;let i,o=0;for(const s of t)o===e.length?e.push(i=new Q(this.O(M()),this.O(M()),this,this.options)):i=e[o],i._$AI(s),o++;o<e.length&&(this._$AR(i&&i._$AB.nextSibling,o),e.length=o)}_$AR(t=this._$AA.nextSibling,e){for(this._$AP?.(!1,!0,e);t!==this._$AB;){const e=k(t).nextSibling;k(t).remove(),t=e}}setConnected(t){void 0===this._$AM&&(this._$Cv=t,this._$AP?.(t))}}class tt{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(t,e,i,o,s){this.type=1,this._$AH=j,this._$AN=void 0,this.element=t,this.name=e,this._$AM=o,this.options=s,i.length>2||""!==i[0]||""!==i[1]?(this._$AH=Array(i.length-1).fill(new String),this.strings=i):this._$AH=j}_$AI(t,e=this,i,o){const s=this.strings;let n=!1;if(void 0===s)t=J(this,t,e,0),n=!D(t)||t!==this._$AH&&t!==V,n&&(this._$AH=t);else{const o=t;let r,a;for(t=s[0],r=0;r<s.length-1;r++)a=J(this,o[i+r],e,r),a===V&&(a=this._$AH[r]),n||=!D(a)||a!==this._$AH[r],a===j?t=j:t!==j&&(t+=(a??"")+s[r+1]),this._$AH[r]=a}n&&!o&&this.j(t)}j(t){t===j?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,t??"")}}class et extends tt{constructor(){super(...arguments),this.type=3}j(t){this.element[this.name]=t===j?void 0:t}}class it extends tt{constructor(){super(...arguments),this.type=4}j(t){this.element.toggleAttribute(this.name,!!t&&t!==j)}}class ot extends tt{constructor(t,e,i,o,s){super(t,e,i,o,s),this.type=5}_$AI(t,e=this){if((t=J(this,t,e,0)??j)===V)return;const i=this._$AH,o=t===j&&i!==j||t.capture!==i.capture||t.once!==i.once||t.passive!==i.passive,s=t!==j&&(i===j||o);o&&this.element.removeEventListener(this.name,this,i),s&&this.element.addEventListener(this.name,this,t),this._$AH=t}handleEvent(t){"function"==typeof this._$AH?this._$AH.call(this.options?.host??this.element,t):this._$AH.handleEvent(t)}}class st{constructor(t,e,i){this.element=t,this.type=6,this._$AN=void 0,this._$AM=e,this.options=i}get _$AU(){return this._$AM._$AU}_$AI(t){J(this,t)}}const nt=w.litHtmlPolyfillSupport;nt?.(Y,Q),(w.litHtmlVersions??=[]).push("3.3.2");const rt=globalThis;class at extends ${constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){const t=super.createRenderRoot();return this.renderOptions.renderBefore??=t.firstChild,t}update(t){const e=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(t),this._$Do=((t,e,i)=>{const o=i?.renderBefore??e;let s=o._$litPart$;if(void 0===s){const t=i?.renderBefore??null;o._$litPart$=s=new Q(e.insertBefore(M(),t),t,void 0,i??{})}return s._$AI(t),s})(e,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return V}}at._$litElement$=!0,at.finalized=!0,rt.litElementHydrateSupport?.({LitElement:at});const lt=rt.litElementPolyfillSupport;lt?.({LitElement:at}),(rt.litElementVersions??=[]).push("4.2.2");const ct=t=>(e,i)=>{void 0!==i?i.addInitializer(()=>{customElements.define(t,e)}):customElements.define(t,e)},dt={attribute:!0,type:String,converter:b,reflect:!1,hasChanged:y},ht=(t=dt,e,i)=>{const{kind:o,metadata:s}=i;let n=globalThis.litPropertyMetadata.get(s);if(void 0===n&&globalThis.litPropertyMetadata.set(s,n=new Map),"setter"===o&&((t=Object.create(t)).wrapped=!0),n.set(i.name,t),"accessor"===o){const{name:o}=i;return{set(i){const s=e.get.call(this);e.set.call(this,i),this.requestUpdate(o,s,t,!0,i)},init(e){return void 0!==e&&this.C(o,void 0,t,e),e}}}if("setter"===o){const{name:o}=i;return function(i){const s=this[o];e.call(this,i),this.requestUpdate(o,s,t,!0,i)}}throw Error("Unsupported decorator location: "+o)};function pt(t){return(e,i)=>"object"==typeof i?ht(t,e,i):((t,e,i)=>{const o=e.hasOwnProperty(i);return e.constructor.createProperty(i,t),o?Object.getOwnPropertyDescriptor(e,i):void 0})(t,e,i)}function _t(t){return pt({...t,state:!0,attribute:!1})}const gt={update_interval:2,history_enabled:!0,history_retention:60,history_trail_length:50,show_proxies:!0,show_zones:!0,show_zone_labels:!0,show_signal_overlay:!1,show_accuracy_indicator:!0,theme_mode:"auto",fullscreen_enabled:!0,floor_display_mode:"tabs",auto_fit:!0},ut=["#4FC3F7","#81C784","#FFB74D","#BA68C8","#4DB6AC","#FFD54F","#F06292","#E57373"],ft=["#4FC3F7","#81C784","#FFB74D","#E57373","#BA68C8","#4DB6AC","#FFD54F","#F06292"],vt={phone:"mdi:cellphone",tablet:"mdi:tablet",watch:"mdi:watch",tag:"mdi:tag",pet:"mdi:paw",person:"mdi:account",car:"mdi:car",key:"mdi:key"},mt="1.2.0",bt="ble-livemap-card",yt="ble-livemap-card-editor";function xt(t,e,i,o,s,n){const r=[],a=[];for(const i of e){const e=t.get(i.proxy_entity_id);if(!e||i.distance<=0||i.distance>50)continue;const o=e.x/100*s,l=e.y/100*n;r.push({x:o,y:l,r:i.distance});const c=1/(i.distance*i.distance+.1);a.push(c)}if(0===r.length)return null;if(1===r.length){const t=r[0];return{x:t.x/s*100,y:t.y/n*100,accuracy:Math.min(2*t.r,15),confidence:.3}}if(2===r.length){const t=a[0]+a[1],e=(r[0].x*a[0]+r[1].x*a[1])/t,i=(r[0].y*a[0]+r[1].y*a[1])/t,o=(r[0].r+r[1].r)/2;return{x:e/s*100,y:i/n*100,accuracy:Math.min(1.5*o,12),confidence:.5}}const l=function(t,e){const i=t.length,o=i-1,s=t[o].x,n=t[o].y,r=t[o].r;let a=0,l=0,c=0,d=0,h=0;for(let o=0;o<i-1;o++){const i=t[o].x,p=t[o].y,_=t[o].r,g=e[o],u=2*(s-i),f=2*(n-p),v=r*r-_*_-s*s+i*i-n*n+p*p;a+=g*u*u,l+=g*u*f,c+=g*f*f,d+=g*u*v,h+=g*f*v}const p=a*c-l*l;if(Math.abs(p)<1e-10)return function(t,e){let i=0,o=0,s=0;for(let n=0;n<t.length;n++)o+=t[n].x*e[n],s+=t[n].y*e[n],i+=e[n];return{x:o/i,y:s/i}}(t,e);const _=(c*d-l*h)/p,g=(a*h-l*d)/p;return{x:_,y:g}}(r,a);if(!l)return null;let c=0,d=0;for(let t=0;t<r.length;t++){const e=l.x-r[t].x,i=l.y-r[t].y,o=Math.sqrt(e*e+i*i);c+=Math.abs(o-r[t].r)*a[t],d+=a[t]}const h=c/d,p=Math.min(r.length/6,1),_=Math.max(0,1-h/10),g=Math.min(.3+.4*p+.3*_,1);return{x:Math.max(0,Math.min(100,l.x/s*100)),y:Math.max(0,Math.min(100,l.y/n*100)),accuracy:Math.max(.5,Math.min(2*h,10)),confidence:g}}function $t(t,e,i=.3){return t?e?{x:e.x+i*(t.x-e.x),y:e.y+i*(t.y-e.y),accuracy:e.accuracy+i*(t.accuracy-e.accuracy),confidence:e.confidence+i*(t.confidence-e.confidence)}:t:e}const wt=new Map,kt=.08;function Ct(t,e,i,o,s,n){const{ctx:r,width:a,height:l,dpr:c}=t;if(r.clearRect(0,0,a*c,l*c),r.save(),r.scale(c,c),!1!==s.show_zones&&o.length>0)for(const e of o)n&&e.floor_id&&e.floor_id!==n||At(t,e,!1!==s.show_zone_labels);if(s.show_signal_overlay&&function(t,e,i){const{ctx:o,width:s,height:n}=t,r=e.filter(t=>!i||!t.floor_id||t.floor_id===i);if(0===r.length)return;for(const t of r){const e=t.x/100*s,i=t.y/100*n,r=.3*Math.min(s,n),a=o.createRadialGradient(e,i,0,e,i,r);a.addColorStop(0,"rgba(76,175,80,0.08)"),a.addColorStop(.5,"rgba(76,175,80,0.03)"),a.addColorStop(1,"rgba(76,175,80,0)"),o.beginPath(),o.arc(e,i,r,0,2*Math.PI),o.fillStyle=a,o.fill()}}(t,i,n),s.show_proxies)for(const e of i)n&&e.floor_id&&e.floor_id!==n||St(t,e);for(const i of e)i.position&&(n&&i.position.floor_id&&i.position.floor_id!==n||!1!==i.config.show_trail&&i.history.length>1&&Pt(t,i,a,l));for(const i of e)i.position&&(n&&i.position.floor_id&&i.position.floor_id!==n||zt(t,i,a,l,s));r.restore()}function At(t,e,i){const{ctx:o,width:s,height:n,isDark:r}=t,a=e.points;if(!a||a.length<3)return;const l=e.color||"#4FC3F7",c=e.border_color||l,d=e.opacity??.12,h=Et(l),p=Et(c);o.beginPath(),o.moveTo(a[0].x/100*s,a[0].y/100*n);for(let t=1;t<a.length;t++)o.lineTo(a[t].x/100*s,a[t].y/100*n);if(o.closePath(),o.fillStyle=`rgba(${h.r},${h.g},${h.b},${d})`,o.fill(),o.strokeStyle=`rgba(${p.r},${p.g},${p.b},${Math.min(3*d,.6)})`,o.lineWidth=1.5,o.setLineDash([6,3]),o.stroke(),o.setLineDash([]),i&&!1!==e.show_label&&e.name){const t=function(t){let e=0,i=0;for(const o of t)e+=o.x,i+=o.y;return{x:e/t.length,y:i/t.length}}(a),i=t.x/100*s,l=t.y/100*n;o.font='500 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',o.textAlign="center",o.textBaseline="middle";const c=o.measureText(e.name),d=5,h=i-c.width/2-d,_=l-8,g=c.width+2*d,u=16;o.fillStyle=r?"rgba(0,0,0,0.55)":"rgba(255,255,255,0.75)",Ft(o,h,_,g,u,4),o.fill(),o.fillStyle=`rgba(${p.r},${p.g},${p.b},0.8)`,o.fillText(e.name,i,l)}}function St(t,e){const{ctx:i,width:o,height:s,isDark:n}=t,r=e.x/100*o,a=e.y/100*s;i.beginPath(),i.arc(r,a,8,0,2*Math.PI),i.fillStyle=n?"rgba(255,255,255,0.1)":"rgba(0,0,0,0.05)",i.fill(),i.beginPath(),i.arc(r,a,6,0,2*Math.PI);const l=e.color||(n?"#546E7A":"#90A4AE");i.fillStyle=l,i.fill(),i.fillStyle="#fff",i.font="bold 6px sans-serif",i.textAlign="center",i.textBaseline="middle",i.fillText("B",r,a),e.name&&(i.font='10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',i.fillStyle=n?"rgba(255,255,255,0.5)":"rgba(0,0,0,0.4)",i.textAlign="center",i.textBaseline="top",i.fillText(e.name,r,a+6+6))}function zt(t,e,i,o,s){const{ctx:n,isDark:r}=t,a=e.position,l=e.config.color||"#4FC3F7",c=e.device_id,d=a.x/100*i,h=a.y/100*o,p=Math.max(8,a.accuracy/20*Math.min(i,o));let _=wt.get(c);_?(_.x+=(d-_.x)*kt,_.y+=(h-_.y)*kt,_.accuracy+=(p-_.accuracy)*kt):(_={x:d,y:h,accuracy:p},wt.set(c,_));const g=_.x,u=_.y,f=_.accuracy,v=Et(l),m=n.createRadialGradient(g,u,0,g,u,f);m.addColorStop(0,`rgba(${v.r},${v.g},${v.b},0.35)`),m.addColorStop(.5,`rgba(${v.r},${v.g},${v.b},0.15)`),m.addColorStop(1,`rgba(${v.r},${v.g},${v.b},0)`),n.beginPath(),n.arc(g,u,f,0,2*Math.PI),n.fillStyle=m,n.fill(),s.show_accuracy_indicator&&(n.beginPath(),n.arc(g,u,.7*f,0,2*Math.PI),n.strokeStyle=`rgba(${v.r},${v.g},${v.b},0.2)`,n.lineWidth=1,n.setLineDash([4,4]),n.stroke(),n.setLineDash([]));const b=Date.now()%3e3/3e3,y=10+3*Math.sin(b*Math.PI*2),x=.3+.15*Math.sin(b*Math.PI*2);if(n.beginPath(),n.arc(g,u,y,0,2*Math.PI),n.strokeStyle=`rgba(${v.r},${v.g},${v.b},${x})`,n.lineWidth=2,n.stroke(),n.beginPath(),n.arc(g,u,7,0,2*Math.PI),n.fillStyle=l,n.fill(),n.beginPath(),n.arc(g,u,3,0,2*Math.PI),n.fillStyle="#fff",n.fill(),!1!==e.config.show_label){const t=e.config.name||e.name;n.font='600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',n.textAlign="center",n.textBaseline="top";const i=n.measureText(t),o=g,s=u+14,a=4;n.fillStyle=r?"rgba(0,0,0,0.7)":"rgba(255,255,255,0.85)",Ft(n,o-i.width/2-a,s-1,i.width+2*a,14,4),n.fill(),n.fillStyle=l,n.fillText(t,o,s+1)}}function Pt(t,e,i,o){const{ctx:s}=t,n=e.history,r=Et(e.config.trail_color||e.config.color||"#4FC3F7");if(!(n.length<2)){s.lineCap="round",s.lineJoin="round";for(let t=1;t<n.length;t++){const e=t/n.length*.5,a=1+t/n.length*2,l=n[t-1].x/100*i,c=n[t-1].y/100*o,d=n[t].x/100*i,h=n[t].y/100*o;s.beginPath(),s.moveTo(l,c),s.lineTo(d,h),s.strokeStyle=`rgba(${r.r},${r.g},${r.b},${e})`,s.lineWidth=a,s.stroke()}for(let t=0;t<n.length;t++){const e=t/n.length*.4,a=1+t/n.length*1.5,l=n[t].x/100*i,c=n[t].y/100*o;s.beginPath(),s.arc(l,c,a,0,2*Math.PI),s.fillStyle=`rgba(${r.r},${r.g},${r.b},${e})`,s.fill()}}}function Ft(t,e,i,o,s,n){t.beginPath(),t.moveTo(e+n,i),t.lineTo(e+o-n,i),t.quadraticCurveTo(e+o,i,e+o,i+n),t.lineTo(e+o,i+s-n),t.quadraticCurveTo(e+o,i+s,e+o-n,i+s),t.lineTo(e+n,i+s),t.quadraticCurveTo(e,i+s,e,i+s-n),t.lineTo(e,i+n),t.quadraticCurveTo(e,i,e+n,i),t.closePath()}function Et(t){const e=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(t);return e?{r:parseInt(e[1],16),g:parseInt(e[2],16),b:parseInt(e[3],16)}:{r:79,g:195,b:247}}const Mt="positions";class Dt{constructor(t=60,e=50){this.db=null,this.memoryCache=new Map,this.maxRetentionMs=60*t*1e3,this.maxTrailLength=e}async init(){return new Promise((t,e)=>{try{const e=indexedDB.open("ble-livemap-history",1);e.onupgradeneeded=t=>{const e=t.target.result;if(!e.objectStoreNames.contains(Mt)){const t=e.createObjectStore(Mt,{autoIncrement:!0});t.createIndex("deviceId","deviceId",{unique:!1}),t.createIndex("timestamp","timestamp",{unique:!1}),t.createIndex("deviceTimestamp",["deviceId","timestamp"],{unique:!1})}},e.onsuccess=e=>{this.db=e.target.result,this.purgeOldEntries(),t()},e.onerror=()=>{console.warn("[ble-livemap] IndexedDB not available, using memory-only history"),t()}}catch{console.warn("[ble-livemap] IndexedDB not supported, using memory-only history"),t()}})}async addPoint(t,e){this.memoryCache.has(t)||this.memoryCache.set(t,[]);const i=this.memoryCache.get(t);for(i.push(e);i.length>this.maxTrailLength;)i.shift();if(this.db)try{const i=this.db.transaction(Mt,"readwrite");i.objectStore(Mt).add({deviceId:t,...e})}catch{}}getTrail(t){return this.memoryCache.get(t)||[]}async loadHistory(t){return this.db?new Promise(e=>{try{const i=this.db.transaction(Mt,"readonly"),o=i.objectStore(Mt).index("deviceTimestamp"),s=Date.now()-this.maxRetentionMs,n=IDBKeyRange.bound([t,s],[t,1/0]),r=o.getAll(n);r.onsuccess=()=>{const i=(r.result||[]).map(t=>({x:t.x,y:t.y,timestamp:t.timestamp,floor_id:t.floor_id}));this.memoryCache.set(t,i.slice(-this.maxTrailLength)),e(i)},r.onerror=()=>{e(this.memoryCache.get(t)||[])}}catch{e(this.memoryCache.get(t)||[])}}):this.memoryCache.get(t)||[]}async purgeOldEntries(){if(this.db)try{const t=Date.now()-this.maxRetentionMs,e=this.db.transaction(Mt,"readwrite"),i=e.objectStore(Mt).index("timestamp"),o=IDBKeyRange.upperBound(t);i.openCursor(o).onsuccess=t=>{const e=t.target.result;e&&(e.delete(),e.continue())}}catch{}}updateSettings(t,e){this.maxRetentionMs=60*t*1e3,this.maxTrailLength=e}async clear(){if(this.memoryCache.clear(),this.db)try{const t=this.db.transaction(Mt,"readwrite");t.objectStore(Mt).clear()}catch{}}}const Tt={en:{common:{version:"Version",no_floorplan:"No floor plan configured. Open the card editor to set up your map.",no_devices:"No tracked devices configured.",loading:"Loading...",error:"Error",unknown:"Unknown",configure:"Configure"},editor:{title:"BLE LiveMap Configuration",expand_editor:"Expand editor",collapse_editor:"Collapse editor",floorplan:"Floor Plan",floorplan_image:"Floor plan image URL",floorplan_image_help:"Use /local/filename.png for images in your www folder",floors:"Floors",floor_name:"Floor name",floor_image:"Floor plan image URL",add_floor:"Add floor",remove_floor:"Remove floor",real_dimensions:"Real dimensions",dimensions_help:"Enter manually or use the calibration tool above to calculate automatically.",image_width:"Width (meters)",image_height:"Height (meters)",calibration:"Calibration Tool",calibration_help:"Mark a known distance on the floor plan (e.g. a door opening, a wall you have measured) and enter the real length. The tool will calculate the full dimensions automatically.",calibration_start:"Measure distance",calibration_cancel:"Cancel",calibration_reset:"Reset",calibration_click_start:"Click the START point of the known distance",calibration_click_end:"Click the END point of the known distance",calibration_distance:"Real distance between the two points",calibration_distance_placeholder:"e.g. 3.5",calibration_apply:"Apply",calibration_result:"Calculated dimensions",proxies:"BLE Proxies",proxy_entity:"Proxy entity (type to search)",proxy_name:"Display name",proxy_position:"Position on map",add_proxy:"Add proxy",remove_proxy:"Remove proxy",place_on_map:"Click on map to place",no_entities_found:"No matching entities found",zones:"Zones",zones_help:"Draw zones on the map to define rooms and areas. Click to add points, click near the first point to close the polygon.",zone_name:"Zone name",zone_color:"Fill color",zone_border_color:"Border color",zone_opacity:"Opacity",zone_show_label:"Show label",zone_points:"points",zone_redraw:"Redraw",zone_draw_hint:"Click on the map to draw zone corners. Click near the first point to close.",zone_finish:"Finish zone",add_zone:"Add zone",remove_zone:"Remove zone",devices:"Tracked Devices",device_entity:"Bermuda device prefix (type to search)",device_name:"Display name",device_color:"Color",device_icon:"Icon",device_trail:"Show trail",device_label:"Show label",add_device:"Add device",remove_device:"Remove device",discovered_devices:"Discovered Bermuda devices (click to add):",no_bermuda_devices:"No Bermuda devices found in Home Assistant",appearance:"Appearance",card_title:"Card title",show_proxies:"Show proxy indicators",show_zones:"Show zones",show_zone_labels:"Show zone labels",show_signal_overlay:"Show signal coverage",show_accuracy:"Show accuracy indicator",theme_mode:"Theme mode",theme_auto:"Auto (follow HA)",theme_dark:"Dark",theme_light:"Light",floor_display:"Floor display mode",floor_display_tabs:"Tabs (one floor at a time)",floor_display_stacked:"Stacked (all floors visible)",auto_fit:"Auto-fit map to available space",fullscreen:"Enable fullscreen button",history:"History & Trails",history_enabled:"Enable position history",history_retention:"History retention (minutes)",history_trail_length:"Max trail points",update_interval:"Update interval (seconds)",advanced:"Advanced"},card:{fullscreen:"Toggle fullscreen",floor_select:"Select floor",last_seen:"Last seen",accuracy:"Accuracy",confidence:"Confidence",distance:"Distance",nearest:"Nearest proxy",area:"Area",devices_tracked:"devices tracked",proxies_active:"proxies active",clear_history:"Clear history",toggle_proxies:"Toggle proxy visibility",toggle_zones:"Toggle zone visibility"}},sv:{common:{version:"Version",no_floorplan:"Ingen planritning konfigurerad. Öppna kortets editor för att konfigurera din karta.",no_devices:"Inga spårade enheter konfigurerade.",loading:"Laddar...",error:"Fel",unknown:"Okänd",configure:"Konfigurera"},editor:{title:"BLE LiveMap Konfiguration",expand_editor:"Expandera editor",collapse_editor:"Minimera editor",floorplan:"Planritning",floorplan_image:"URL till planritning",floorplan_image_help:"Använd /local/filnamn.png för bilder i din www-mapp",floors:"Våningar",floor_name:"Våningsnamn",floor_image:"URL till planritning",add_floor:"Lägg till våning",remove_floor:"Ta bort våning",real_dimensions:"Verkliga mått",dimensions_help:"Ange manuellt eller använd kalibreringsverktyget ovan för att beräkna automatiskt.",image_width:"Bredd (meter)",image_height:"Höjd (meter)",calibration:"Kalibreringsverktyg",calibration_help:"Markera en känd sträcka på planritningen (t.ex. en dörröppning, en vägg du mätt) och ange den verkliga längden. Verktyget beräknar hela ritningens mått automatiskt.",calibration_start:"Mät sträcka",calibration_cancel:"Avbryt",calibration_reset:"Återställ",calibration_click_start:"Klicka på STARTPUNKTEN för den kända sträckan",calibration_click_end:"Klicka på SLUTPUNKTEN för den kända sträckan",calibration_distance:"Verkligt avstånd mellan de två punkterna",calibration_distance_placeholder:"t.ex. 3.5",calibration_apply:"Applicera",calibration_result:"Beräknade mått",proxies:"BLE-proxies",proxy_entity:"Proxy-entitet (skriv för att söka)",proxy_name:"Visningsnamn",proxy_position:"Position på kartan",add_proxy:"Lägg till proxy",remove_proxy:"Ta bort proxy",place_on_map:"Klicka på kartan för att placera",no_entities_found:"Inga matchande entiteter hittades",zones:"Zoner",zones_help:"Rita zoner på kartan för att definiera rum och områden. Klicka för att lägga till hörn, klicka nära första punkten för att stänga polygonen.",zone_name:"Zonnamn",zone_color:"Fyllnadsfärg",zone_border_color:"Kantfärg",zone_opacity:"Opacitet",zone_show_label:"Visa etikett",zone_points:"punkter",zone_redraw:"Rita om",zone_draw_hint:"Klicka på kartan för att rita zonens hörn. Klicka nära första punkten för att stänga.",zone_finish:"Slutför zon",add_zone:"Lägg till zon",remove_zone:"Ta bort zon",devices:"Spårade enheter",device_entity:"Bermuda-enhetsprefix (skriv för att söka)",device_name:"Visningsnamn",device_color:"Färg",device_icon:"Ikon",device_trail:"Visa spår",device_label:"Visa etikett",add_device:"Lägg till enhet",remove_device:"Ta bort enhet",discovered_devices:"Upptäckta Bermuda-enheter (klicka för att lägga till):",no_bermuda_devices:"Inga Bermuda-enheter hittades i Home Assistant",appearance:"Utseende",card_title:"Korttitel",show_proxies:"Visa proxy-indikatorer",show_zones:"Visa zoner",show_zone_labels:"Visa zonetiketter",show_signal_overlay:"Visa signaltäckning",show_accuracy:"Visa noggrannhetsindikator",theme_mode:"Temaläge",theme_auto:"Auto (följ HA)",theme_dark:"Mörkt",theme_light:"Ljust",floor_display:"Våningsvisning",floor_display_tabs:"Flikar (en våning åt gången)",floor_display_stacked:"Staplade (alla våningar synliga)",auto_fit:"Anpassa kartan automatiskt till tillgängligt utrymme",fullscreen:"Aktivera helskärmsknapp",history:"Historik och spår",history_enabled:"Aktivera positionshistorik",history_retention:"Historiklagring (minuter)",history_trail_length:"Max antal spårpunkter",update_interval:"Uppdateringsintervall (sekunder)",advanced:"Avancerat"},card:{fullscreen:"Växla helskärm",floor_select:"Välj våning",last_seen:"Senast sedd",accuracy:"Noggrannhet",confidence:"Konfidens",distance:"Avstånd",nearest:"Närmaste proxy",area:"Område",devices_tracked:"enheter spåras",proxies_active:"proxies aktiva",clear_history:"Rensa historik",toggle_proxies:"Visa/dölj proxies",toggle_zones:"Visa/dölj zoner"}}};function Lt(t,e){const i=e&&Tt[e]?e:"en",o=t.split(".");if(2!==o.length)return t;const[s,n]=o,r=Tt[i];if(r&&r[s]&&r[s][n])return r[s][n];const a=Tt.en;return a&&a[s]&&a[s][n]?a[s][n]:t}let Rt=class extends at{constructor(){super(...arguments),this._activeSection="floorplan",this._placingProxy=null,this._drawingZone=null,this._drawingPoints=[],this._calibrating=!1,this._calibrationPoints=[],this._calibrationMeters=0,this._fullscreenEditor=!1,this._entityFilter="",this._deviceEntityFilter="",this._showEntityDropdown=null,this._showDeviceEntityDropdown=null,this._lang="en"}setConfig(t){this._config={...gt,...t}}_t(t){return Lt(t,this._lang)}_fireConfigChanged(){const t=new CustomEvent("config-changed",{detail:{config:this._config},bubbles:!0,composed:!0});this.dispatchEvent(t)}_updateConfig(t,e){this._config={...this._config,[t]:e},this._fireConfigChanged()}_getAvailableEntities(t,e){if(!this.hass?.states)return[];return Object.keys(this.hass.states).filter(t=>"proxy"===e?t.includes("bluetooth")||t.includes("ble")||t.includes("proxy")||t.includes("esp")||t.startsWith("sensor.")||t.startsWith("binary_sensor."):t.includes("bermuda")||t.includes("ble")||t.startsWith("sensor.")||t.startsWith("device_tracker.")).filter(e=>{if(!t)return!0;const i=t.toLowerCase(),o=this.hass.states[e]?.attributes?.friendly_name||"";return e.toLowerCase().includes(i)||o.toLowerCase().includes(i)}).slice(0,50).map(t=>({entity_id:t,name:this.hass.states[t]?.attributes?.friendly_name||t}))}_getBermudaDevicePrefixes(){if(!this.hass?.states)return[];const t=new Map;return Object.keys(this.hass.states).filter(t=>t.includes("bermuda")).forEach(e=>{const i=e.split("_"),o=i[i.length-1];if(["distance","area","rssi","power","scanner"].includes(o)){const o=i.slice(0,-1).join("_");if(!t.has(o)){const i=(this.hass.states[e]?.attributes?.friendly_name||o).replace(/ (Distance|Area|RSSI|Power|Scanner)$/i,"");t.set(o,i)}}}),Array.from(t.entries()).map(([t,e])=>({prefix:t,name:e}))}_renderFloorplanSection(){const t=this._config.floors||[],e=0===t.length,i=this._getFloorplanImage(),o=2===this._calibrationPoints.length&&this._calibrationMeters>0;return N`
      <div class="section">
        <div class="section-title">${this._t("editor.floorplan")}</div>

        ${e?N`
              <div class="field">
                <label>${this._t("editor.floorplan_image")}</label>
                <input
                  type="text"
                  .value=${this._config.floorplan_image||""}
                  @input=${t=>this._updateConfig("floorplan_image",t.target.value)}
                  placeholder="/local/floorplan.png"
                />
                <span class="help">${this._t("editor.floorplan_image_help")}</span>
              </div>
            `:j}

        <!-- Calibration Tool -->
        ${i?N`
              <div class="subsection">
                <div class="subsection-header">
                  <span>${this._t("editor.calibration")}</span>
                </div>
                <p class="help">${this._t("editor.calibration_help")}</p>

                <div class="map-preview calibration-map" @click=${this._handleCalibrationMapClick}>
                  <img src=${i} alt="Floor plan" />
                  <svg class="zone-overlay" viewBox="0 0 100 100" preserveAspectRatio="none">
                    ${this._calibrationPoints.length>=1?N`
                          <circle
                            cx="${this._calibrationPoints[0].x}"
                            cy="${this._calibrationPoints[0].y}"
                            r="0.7"
                            fill="#FF5722"
                            stroke="white"
                            stroke-width="0.2"
                          />
                        `:j}
                    ${2===this._calibrationPoints.length?N`
                          <line
                            x1="${this._calibrationPoints[0].x}"
                            y1="${this._calibrationPoints[0].y}"
                            x2="${this._calibrationPoints[1].x}"
                            y2="${this._calibrationPoints[1].y}"
                            stroke="#FF5722"
                            stroke-width="0.3"
                            stroke-dasharray="1,0.5"
                          />
                          <circle
                            cx="${this._calibrationPoints[1].x}"
                            cy="${this._calibrationPoints[1].y}"
                            r="0.7"
                            fill="#FF5722"
                            stroke="white"
                            stroke-width="0.2"
                          />
                        `:j}
                  </svg>
                  ${this._calibrating?N`<div class="placing-hint">
                        ${0===this._calibrationPoints.length?this._t("editor.calibration_click_start"):this._t("editor.calibration_click_end")}
                      </div>`:j}
                </div>

                <div class="field-row" style="margin-bottom: 8px;">
                  <button
                    class="place-btn ${this._calibrating?"active":""}"
                    @click=${this._toggleCalibration}
                  >
                    ${this._calibrating?this._t("editor.calibration_cancel"):this._t("editor.calibration_start")}
                  </button>
                  ${2===this._calibrationPoints.length?N`
                        <button class="place-btn" @click=${this._resetCalibration}>
                          ${this._t("editor.calibration_reset")}
                        </button>
                      `:j}
                </div>

                ${2===this._calibrationPoints.length?N`
                      <div class="field">
                        <label>${this._t("editor.calibration_distance")}</label>
                        <div class="field-row">
                          <input
                            type="number"
                            .value=${String(this._calibrationMeters||"")}
                            @input=${this._handleCalibrationDistanceInput}
                            placeholder="${this._t("editor.calibration_distance_placeholder")}"
                            min="0.1"
                            step="0.1"
                          />
                          <span class="unit">m</span>
                          ${this._calibrationMeters>0?N`
                                <button class="place-btn" @click=${this._applyCalibration}>
                                  ${this._t("editor.calibration_apply")}
                                </button>
                              `:j}
                        </div>
                      </div>
                      ${o?N`
                            <div class="calibration-result">
                              <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                              </svg>
                              ${this._t("editor.calibration_result")}:
                              <strong>${this._getCalibrationResult()}</strong>
                            </div>
                          `:j}
                    `:j}
              </div>
            `:j}

        <!-- Manual dimensions -->
        <div class="field">
          <label>${this._t("editor.real_dimensions")}</label>
          <div class="field-row">
            <input
              type="number"
              .value=${String(this._getFirstFloor()?.image_width||20)}
              @input=${t=>this._updateFloorDimension("image_width",t)}
              placeholder="20"
              min="1"
              step="0.5"
            />
            <span class="unit">m</span>
            <span class="separator">x</span>
            <input
              type="number"
              .value=${String(this._getFirstFloor()?.image_height||15)}
              @input=${t=>this._updateFloorDimension("image_height",t)}
              placeholder="15"
              min="1"
              step="0.5"
            />
            <span class="unit">m</span>
          </div>
          <span class="help">${this._t("editor.dimensions_help")}</span>
        </div>

        <!-- Multi-floor management -->
        <div class="subsection">
          <div class="subsection-header">
            <span>${this._t("editor.floors")}</span>
            <button class="add-btn" @click=${this._addFloor}>+ ${this._t("editor.add_floor")}</button>
          </div>
          ${t.map((t,e)=>N`
              <div class="list-item">
                <div class="list-item-content">
                  <input
                    type="text"
                    .value=${t.name}
                    @input=${t=>this._updateFloor(e,"name",t.target.value)}
                    placeholder="${this._t("editor.floor_name")}"
                  />
                  <input
                    type="text"
                    .value=${t.image}
                    @input=${t=>this._updateFloor(e,"image",t.target.value)}
                    placeholder="${this._t("editor.floor_image")}"
                  />
                </div>
                <button class="remove-btn" @click=${()=>this._removeFloor(e)}>
                  <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                  </svg>
                </button>
              </div>
            `)}
        </div>
      </div>
    `}_renderProxiesSection(){const t=this._config.proxies||[],e=this._getFloorplanImage();return N`
      <div class="section">
        <div class="section-title">${this._t("editor.proxies")}</div>

        ${e?N`
              <div class="map-preview" @click=${this._handleProxyMapClick}>
                <img src=${e} alt="Floor plan" />
                ${t.map((t,e)=>N`
                    <div
                      class="proxy-marker ${this._placingProxy===e?"placing":""}"
                      style="left: ${t.x}%; top: ${t.y}%"
                      title="${t.name||t.entity_id}"
                    >
                      <span>B</span>
                    </div>
                  `)}
                ${null!==this._placingProxy?N`<div class="placing-hint">${this._t("editor.place_on_map")}</div>`:j}
              </div>
            `:j}

        ${t.map((t,e)=>N`
            <div class="list-item">
              <div class="list-item-content">
                <div class="entity-picker">
                  <input
                    type="text"
                    .value=${t.entity_id}
                    @input=${t=>{const i=t.target.value;this._updateProxy(e,"entity_id",i),this._entityFilter=i,this._showEntityDropdown=e}}
                    @focus=${()=>{this._entityFilter=t.entity_id||"",this._showEntityDropdown=e}}
                    @blur=${()=>setTimeout(()=>{this._showEntityDropdown=null},200)}
                    placeholder="${this._t("editor.proxy_entity")}"
                    autocomplete="off"
                  />
                  ${this._showEntityDropdown===e?N`
                        <div class="entity-dropdown">
                          ${this._getAvailableEntities(this._entityFilter,"proxy").map(t=>N`
                              <div
                                class="entity-option"
                                @mousedown=${()=>{this._updateProxy(e,"entity_id",t.entity_id),this._showEntityDropdown=null}}
                              >
                                <span class="entity-id">${t.entity_id}</span>
                                <span class="entity-name">${t.name}</span>
                              </div>
                            `)}
                          ${0===this._getAvailableEntities(this._entityFilter,"proxy").length?N`<div class="entity-option empty">${this._t("editor.no_entities_found")}</div>`:j}
                        </div>
                      `:j}
                </div>
                <input
                  type="text"
                  .value=${t.name||""}
                  @input=${t=>this._updateProxy(e,"name",t.target.value)}
                  placeholder="${this._t("editor.proxy_name")}"
                />
                <div class="field-row">
                  <span class="label-sm">X: ${t.x.toFixed(1)}%</span>
                  <span class="label-sm">Y: ${t.y.toFixed(1)}%</span>
                  <button
                    class="place-btn ${this._placingProxy===e?"active":""}"
                    @click=${()=>this._placingProxy=this._placingProxy===e?null:e}
                  >
                    ${this._t("editor.place_on_map")}
                  </button>
                </div>
              </div>
              <button class="remove-btn" @click=${()=>this._removeProxy(e)}>
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>
          `)}

        <button class="add-btn full" @click=${this._addProxy}>+ ${this._t("editor.add_proxy")}</button>
      </div>
    `}_renderZonesSection(){const t=this._config.zones||[],e=this._getFloorplanImage();return N`
      <div class="section">
        <div class="section-title">${this._t("editor.zones")}</div>
        <p class="help">${this._t("editor.zones_help")}</p>

        ${e?N`
              <div class="map-preview zone-drawing" @click=${this._handleZoneMapClick}>
                <img src=${e} alt="Floor plan" />
                <svg class="zone-overlay" viewBox="0 0 100 100" preserveAspectRatio="none">
                  ${t.map((t,e)=>N`
                      <polygon
                        points="${t.points.map(t=>`${t.x},${t.y}`).join(" ")}"
                        fill="${t.color||ut[e%ut.length]}"
                        fill-opacity="${t.opacity??.15}"
                        stroke="${t.border_color||t.color||ut[e%ut.length]}"
                        stroke-width="0.3"
                        stroke-dasharray="1,0.5"
                      />
                      ${!1!==t.show_label?N`
                            <text
                              x="${this._getZoneCentroid(t.points).x}"
                              y="${this._getZoneCentroid(t.points).y}"
                              text-anchor="middle"
                              dominant-baseline="central"
                              font-size="2.5"
                              fill="${t.border_color||t.color||ut[e%ut.length]}"
                              font-weight="600"
                            >${t.name}</text>
                          `:j}
                    `)}
                  <!-- Drawing in progress -->
                  ${null!==this._drawingZone&&this._drawingPoints.length>0?N`
                        <polyline
                          points="${this._drawingPoints.map(t=>`${t.x},${t.y}`).join(" ")}"
                          fill="none"
                          stroke="#4FC3F7"
                          stroke-width="0.3"
                          stroke-dasharray="0.5,0.5"
                        />
                        ${this._drawingPoints.map(t=>N`
                            <circle cx="${t.x}" cy="${t.y}" r="0.5" fill="#4FC3F7" />
                          `)}
                      `:j}
                </svg>
                ${null!==this._drawingZone?N`<div class="placing-hint">${this._t("editor.zone_draw_hint")}</div>`:j}
              </div>
            `:j}

        ${t.map((t,e)=>N`
            <div class="list-item">
              <div class="zone-color-dot" style="background: ${t.color||ut[e%ut.length]}"></div>
              <div class="list-item-content">
                <input
                  type="text"
                  .value=${t.name}
                  @input=${t=>this._updateZone(e,"name",t.target.value)}
                  placeholder="${this._t("editor.zone_name")}"
                />
                <div class="field-row">
                  <input
                    type="color"
                    .value=${t.color||ut[e%ut.length]}
                    @input=${t=>this._updateZone(e,"color",t.target.value)}
                    title="${this._t("editor.zone_color")}"
                  />
                  <input
                    type="color"
                    .value=${t.border_color||t.color||ut[e%ut.length]}
                    @input=${t=>this._updateZone(e,"border_color",t.target.value)}
                    title="${this._t("editor.zone_border_color")}"
                  />
                  <span class="label-sm">${t.points.length} ${this._t("editor.zone_points")}</span>
                  <label class="checkbox">
                    <input
                      type="checkbox"
                      .checked=${!1!==t.show_label}
                      @change=${t=>this._updateZone(e,"show_label",t.target.checked)}
                    />
                    ${this._t("editor.zone_show_label")}
                  </label>
                </div>
                <div class="field-row">
                  <span class="label-sm">${this._t("editor.zone_opacity")}</span>
                  <input
                    type="range"
                    min="0"
                    max="0.5"
                    step="0.02"
                    .value=${String(t.opacity??.12)}
                    @input=${t=>this._updateZone(e,"opacity",parseFloat(t.target.value))}
                  />
                </div>
                <div class="field-row">
                  <button
                    class="place-btn ${this._drawingZone===e?"active":""}"
                    @click=${()=>this._startDrawingZone(e)}
                  >
                    ${this._t("editor.zone_redraw")}
                  </button>
                </div>
              </div>
              <button class="remove-btn" @click=${()=>this._removeZone(e)}>
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>
          `)}

        <div class="field-row" style="gap: 8px; margin-top: 4px;">
          <button class="add-btn full" @click=${this._addZone}>+ ${this._t("editor.add_zone")}</button>
          ${null!==this._drawingZone?N`<button class="place-btn active" @click=${this._finishDrawingZone}>${this._t("editor.zone_finish")}</button>`:j}
        </div>
      </div>
    `}_renderDevicesSection(){const t=this._config.tracked_devices||[],e=this._getBermudaDevicePrefixes();return N`
      <div class="section">
        <div class="section-title">${this._t("editor.devices")}</div>

        ${e.length>0?N`
              <div class="discovered-devices">
                <div class="label-sm" style="margin-bottom: 6px;">${this._t("editor.discovered_devices")}</div>
                <div class="discovered-list">
                  ${e.filter(e=>!t.some(t=>t.entity_prefix===e.prefix)).map(t=>N`
                        <button class="discovered-btn" @click=${()=>this._addDeviceFromDiscovery(t.prefix,t.name)}>
                          <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                          </svg>
                          ${t.name}
                        </button>
                      `)}
                </div>
              </div>
            `:j}

        ${t.map((t,i)=>N`
            <div class="list-item">
              <div class="device-color-dot" style="background: ${t.color||ft[i%ft.length]}"></div>
              <div class="list-item-content">
                <div class="entity-picker">
                  <input
                    type="text"
                    .value=${t.entity_prefix||""}
                    @input=${t=>{const e=t.target.value;this._updateDevice(i,"entity_prefix",e),this._deviceEntityFilter=e,this._showDeviceEntityDropdown=i}}
                    @focus=${()=>{this._deviceEntityFilter=t.entity_prefix||"",this._showDeviceEntityDropdown=i}}
                    @blur=${()=>setTimeout(()=>{this._showDeviceEntityDropdown=null},200)}
                    placeholder="${this._t("editor.device_entity")}"
                    autocomplete="off"
                  />
                  ${this._showDeviceEntityDropdown===i?N`
                        <div class="entity-dropdown">
                          ${e.filter(t=>{if(!this._deviceEntityFilter)return!0;const e=this._deviceEntityFilter.toLowerCase();return t.prefix.toLowerCase().includes(e)||t.name.toLowerCase().includes(e)}).map(e=>N`
                                <div
                                  class="entity-option"
                                  @mousedown=${()=>{this._updateDevice(i,"entity_prefix",e.prefix),t.name&&!t.name.startsWith("Device ")||this._updateDevice(i,"name",e.name),this._showDeviceEntityDropdown=null}}
                                >
                                  <span class="entity-id">${e.prefix}</span>
                                  <span class="entity-name">${e.name}</span>
                                </div>
                              `)}
                          ${0===e.length?N`<div class="entity-option empty">${this._t("editor.no_bermuda_devices")}</div>`:j}
                        </div>
                      `:j}
                </div>
                <input
                  type="text"
                  .value=${t.name}
                  @input=${t=>this._updateDevice(i,"name",t.target.value)}
                  placeholder="${this._t("editor.device_name")}"
                />
                <div class="field-row">
                  <input
                    type="color"
                    .value=${t.color||ft[i%ft.length]}
                    @input=${t=>this._updateDevice(i,"color",t.target.value)}
                    title="${this._t("editor.device_color")}"
                  />
                  <select
                    @change=${t=>this._updateDevice(i,"icon",t.target.value)}
                  >
                    ${Object.entries(vt).map(([e,i])=>N`
                        <option value=${e} ?selected=${t.icon===e}>${e}</option>
                      `)}
                  </select>
                  <label class="checkbox">
                    <input
                      type="checkbox"
                      .checked=${!1!==t.show_trail}
                      @change=${t=>this._updateDevice(i,"show_trail",t.target.checked)}
                    />
                    ${this._t("editor.device_trail")}
                  </label>
                  <label class="checkbox">
                    <input
                      type="checkbox"
                      .checked=${!1!==t.show_label}
                      @change=${t=>this._updateDevice(i,"show_label",t.target.checked)}
                    />
                    ${this._t("editor.device_label")}
                  </label>
                </div>
              </div>
              <button class="remove-btn" @click=${()=>this._removeDevice(i)}>
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>
          `)}

        <button class="add-btn full" @click=${this._addDevice}>+ ${this._t("editor.add_device")}</button>
      </div>
    `}_renderAppearanceSection(){return N`
      <div class="section">
        <div class="section-title">${this._t("editor.appearance")}</div>

        <div class="field">
          <label>${this._t("editor.card_title")}</label>
          <input
            type="text"
            .value=${this._config.card_title||""}
            @input=${t=>this._updateConfig("card_title",t.target.value)}
            placeholder="BLE LiveMap"
          />
        </div>

        <div class="field">
          <label>${this._t("editor.update_interval")}</label>
          <input
            type="number"
            .value=${String(this._config.update_interval||2)}
            @input=${t=>this._updateConfig("update_interval",Number(t.target.value))}
            min="1"
            max="30"
            step="1"
          />
        </div>

        <div class="field">
          <label>${this._t("editor.theme_mode")}</label>
          <select
            @change=${t=>this._updateConfig("theme_mode",t.target.value)}
          >
            <option value="auto" ?selected=${"auto"===this._config.theme_mode}>${this._t("editor.theme_auto")}</option>
            <option value="dark" ?selected=${"dark"===this._config.theme_mode}>${this._t("editor.theme_dark")}</option>
            <option value="light" ?selected=${"light"===this._config.theme_mode}>${this._t("editor.theme_light")}</option>
          </select>
        </div>

        <div class="field">
          <label>${this._t("editor.floor_display")}</label>
          <select
            @change=${t=>this._updateConfig("floor_display_mode",t.target.value)}
          >
            <option value="tabs" ?selected=${"tabs"===this._config.floor_display_mode}>${this._t("editor.floor_display_tabs")}</option>
            <option value="stacked" ?selected=${"stacked"===this._config.floor_display_mode}>${this._t("editor.floor_display_stacked")}</option>
          </select>
        </div>

        <label class="checkbox">
          <input
            type="checkbox"
            .checked=${!1!==this._config.auto_fit}
            @change=${t=>this._updateConfig("auto_fit",t.target.checked)}
          />
          ${this._t("editor.auto_fit")}
        </label>

        <label class="checkbox">
          <input
            type="checkbox"
            .checked=${!1!==this._config.show_proxies}
            @change=${t=>this._updateConfig("show_proxies",t.target.checked)}
          />
          ${this._t("editor.show_proxies")}
        </label>

        <label class="checkbox">
          <input
            type="checkbox"
            .checked=${!1!==this._config.show_zones}
            @change=${t=>this._updateConfig("show_zones",t.target.checked)}
          />
          ${this._t("editor.show_zones")}
        </label>

        <label class="checkbox">
          <input
            type="checkbox"
            .checked=${!1!==this._config.show_zone_labels}
            @change=${t=>this._updateConfig("show_zone_labels",t.target.checked)}
          />
          ${this._t("editor.show_zone_labels")}
        </label>

        <label class="checkbox">
          <input
            type="checkbox"
            .checked=${this._config.show_signal_overlay||!1}
            @change=${t=>this._updateConfig("show_signal_overlay",t.target.checked)}
          />
          ${this._t("editor.show_signal_overlay")}
        </label>

        <label class="checkbox">
          <input
            type="checkbox"
            .checked=${!1!==this._config.show_accuracy_indicator}
            @change=${t=>this._updateConfig("show_accuracy_indicator",t.target.checked)}
          />
          ${this._t("editor.show_accuracy")}
        </label>

        <label class="checkbox">
          <input
            type="checkbox"
            .checked=${!1!==this._config.fullscreen_enabled}
            @change=${t=>this._updateConfig("fullscreen_enabled",t.target.checked)}
          />
          ${this._t("editor.fullscreen")}
        </label>
      </div>
    `}_renderHistorySection(){return N`
      <div class="section">
        <div class="section-title">${this._t("editor.history")}</div>

        <label class="checkbox">
          <input
            type="checkbox"
            .checked=${!1!==this._config.history_enabled}
            @change=${t=>this._updateConfig("history_enabled",t.target.checked)}
          />
          ${this._t("editor.history_enabled")}
        </label>

        <div class="field">
          <label>${this._t("editor.history_retention")}</label>
          <input
            type="number"
            .value=${String(this._config.history_retention||60)}
            @input=${t=>this._updateConfig("history_retention",Number(t.target.value))}
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
            @input=${t=>this._updateConfig("history_trail_length",Number(t.target.value))}
            min="10"
            max="500"
            step="10"
          />
        </div>
      </div>
    `}_getFirstFloor(){return this._config.floors?.[0]||null}_getFloorplanImage(){const t=this._getFirstFloor();return t?.image||this._config.floorplan_image||""}_updateFloorDimension(t,e){const i=Number(e.target.value),o=[...this._config.floors||[]];o.length>0&&(o[0]={...o[0],[t]:i},this._updateConfig("floors",o))}_addFloor(){const t=[...this._config.floors||[]];t.push({id:`floor_${Date.now()}`,name:`Floor ${t.length+1}`,image:"",image_width:20,image_height:15}),this._updateConfig("floors",t)}_removeFloor(t){const e=[...this._config.floors||[]];e.splice(t,1),this._updateConfig("floors",e)}_updateFloor(t,e,i){const o=[...this._config.floors||[]];o[t]={...o[t],[e]:i},this._updateConfig("floors",o)}_addProxy(){const t=[...this._config.proxies||[]];t.push({entity_id:"",x:50,y:50,name:""}),this._updateConfig("proxies",t),this._placingProxy=t.length-1}_removeProxy(t){const e=[...this._config.proxies||[]];e.splice(t,1),this._updateConfig("proxies",e),this._placingProxy===t&&(this._placingProxy=null)}_updateProxy(t,e,i){const o=[...this._config.proxies||[]];o[t]={...o[t],[e]:i},this._updateConfig("proxies",o)}_addDevice(){const t=[...this._config.tracked_devices||[]],e=t.length;t.push({entity_prefix:"",name:`Device ${e+1}`,color:ft[e%ft.length],icon:"phone",show_trail:!0,show_label:!0}),this._updateConfig("tracked_devices",t)}_addDeviceFromDiscovery(t,e){const i=[...this._config.tracked_devices||[]],o=i.length;i.push({entity_prefix:t,name:e,color:ft[o%ft.length],icon:"phone",show_trail:!0,show_label:!0}),this._updateConfig("tracked_devices",i)}_removeDevice(t){const e=[...this._config.tracked_devices||[]];e.splice(t,1),this._updateConfig("tracked_devices",e)}_updateDevice(t,e,i){const o=[...this._config.tracked_devices||[]];o[t]={...o[t],[e]:i},this._updateConfig("tracked_devices",o)}_addZone(){const t=[...this._config.zones||[]],e=t.length;t.push({id:`zone_${Date.now()}`,name:"",points:[],color:ut[e%ut.length],border_color:ut[e%ut.length],opacity:.12,show_label:!0}),this._updateConfig("zones",t),this._startDrawingZone(e)}_removeZone(t){const e=[...this._config.zones||[]];e.splice(t,1),this._updateConfig("zones",e),this._drawingZone===t&&(this._drawingZone=null,this._drawingPoints=[])}_updateZone(t,e,i){const o=[...this._config.zones||[]];o[t]={...o[t],[e]:i},this._updateConfig("zones",o)}_startDrawingZone(t){this._drawingZone=t,this._drawingPoints=[],this._placingProxy=null}_finishDrawingZone(){if(null===this._drawingZone||this._drawingPoints.length<3)return;const t=[...this._config.zones||[]];t[this._drawingZone]={...t[this._drawingZone],points:[...this._drawingPoints]},this._updateConfig("zones",t),this._drawingZone=null,this._drawingPoints=[]}_getZoneCentroid(t){if(0===t.length)return{x:50,y:50};let e=0,i=0;for(const o of t)e+=o.x,i+=o.y;return{x:e/t.length,y:i/t.length}}_toggleCalibration(){this._calibrating?(this._calibrating=!1,this._calibrationPoints=[]):(this._calibrating=!0,this._calibrationPoints=[],this._calibrationMeters=0,this._placingProxy=null,this._drawingZone=null)}_resetCalibration(){this._calibrating=!1,this._calibrationPoints=[],this._calibrationMeters=0}_handleCalibrationMapClick(t){if(!this._calibrating)return;if(this._calibrationPoints.length>=2)return;const e=t.currentTarget.querySelector("img");if(!e)return;const i=e.getBoundingClientRect(),o=(t.clientX-i.left)/i.width*100,s=(t.clientY-i.top)/i.height*100,n={x:Math.round(10*o)/10,y:Math.round(10*s)/10};this._calibrationPoints=[...this._calibrationPoints,n],2===this._calibrationPoints.length&&(this._calibrating=!1),this.requestUpdate()}_handleCalibrationDistanceInput(t){this._calibrationMeters=parseFloat(t.target.value)||0}_applyCalibration(){if(2!==this._calibrationPoints.length||this._calibrationMeters<=0)return;const t=this._calibrationPoints[0],e=this._calibrationPoints[1],i=e.x-t.x,o=e.y-t.y;if(Math.sqrt(i*i+o*o)<.5)return;const s=this.shadowRoot?.querySelector(".calibration-map img");if(!s||!s.naturalWidth||!s.naturalHeight)return;const n=s.naturalWidth/s.naturalHeight,r=i/100*n,a=o/100,l=Math.sqrt(r*r+a*a),c=this._calibrationMeters/l,d=c*n,h=Math.round(10*d)/10,p=Math.round(10*c)/10,_=[...this._config.floors||[]];_.length>0?(_[0]={..._[0],image_width:h,image_height:p},this._updateConfig("floors",_)):(this._config={...this._config,floors:[{id:"floor_main",name:"Main",image:this._config.floorplan_image||"",image_width:h,image_height:p}]},this._fireConfigChanged())}_getCalibrationResult(){if(2!==this._calibrationPoints.length||this._calibrationMeters<=0)return"";const t=this.shadowRoot?.querySelector(".calibration-map img");if(!t||!t.naturalWidth||!t.naturalHeight)return"";const e=this._calibrationPoints[0],i=this._calibrationPoints[1],o=i.x-e.x,s=i.y-e.y,n=t.naturalWidth/t.naturalHeight,r=o/100*n,a=s/100,l=Math.sqrt(r*r+a*a),c=this._calibrationMeters/l,d=c*n;return`${Math.round(10*d)/10}m x ${Math.round(10*c)/10}m`}_handleProxyMapClick(t){if(null===this._placingProxy)return;const e=t.currentTarget.querySelector("img");if(!e)return;const i=e.getBoundingClientRect(),o=(t.clientX-i.left)/i.width*100,s=(t.clientY-i.top)/i.height*100;this._updateProxy(this._placingProxy,"x",Math.round(10*o)/10),this._updateProxy(this._placingProxy,"y",Math.round(10*s)/10),this._placingProxy=null}_handleZoneMapClick(t){if(null===this._drawingZone)return;const e=t.currentTarget.querySelector("img");if(!e)return;const i=e.getBoundingClientRect(),o=(t.clientX-i.left)/i.width*100,s=(t.clientY-i.top)/i.height*100,n={x:Math.round(10*o)/10,y:Math.round(10*s)/10};if(this._drawingPoints=[...this._drawingPoints,n],this._drawingPoints.length>=3){const t=this._drawingPoints[0];if(Math.sqrt(Math.pow(n.x-t.x,2)+Math.pow(n.y-t.y,2))<3)return this._drawingPoints=this._drawingPoints.slice(0,-1),void this._finishDrawingZone()}this.requestUpdate()}_toggleFullscreenEditor(){this._fullscreenEditor=!this._fullscreenEditor}static get styles(){return r`
      :host {
        display: block;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        --editor-bg: var(--ha-card-background, #fff);
        --editor-text: var(--primary-text-color, #212121);
        --editor-text-secondary: var(--secondary-text-color, #727272);
        --editor-border: var(--divider-color, rgba(0,0,0,0.12));
        --editor-accent: var(--primary-color, #4FC3F7);
      }

      :host(.fullscreen-editor) {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        z-index: 999 !important;
        background: var(--editor-bg) !important;
        overflow-y: auto !important;
        padding: 0 !important;
        margin: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
      }

      .editor-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 16px;
        border-bottom: 1px solid var(--editor-border);
      }

      .editor-toolbar-title {
        font-size: 14px;
        font-weight: 600;
        color: var(--editor-text);
      }

      .expand-btn {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 6px 12px;
        border: 1px solid var(--editor-border);
        border-radius: 8px;
        background: transparent;
        color: var(--editor-text-secondary);
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .expand-btn:hover {
        background: var(--editor-accent);
        color: white;
        border-color: var(--editor-accent);
      }

      .expand-btn svg {
        width: 14px;
        height: 14px;
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

      .subsection {
        margin-bottom: 16px;
      }

      .subsection-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;
        font-size: 12px;
        font-weight: 600;
        color: var(--editor-text);
      }

      .add-btn {
        padding: 6px 12px;
        border: 1px dashed var(--editor-border);
        border-radius: 8px;
        background: transparent;
        color: var(--editor-accent);
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .add-btn:hover {
        border-color: var(--editor-accent);
        background: rgba(79, 195, 247, 0.05);
      }

      .add-btn.full {
        width: 100%;
        text-align: center;
      }

      .remove-btn {
        background: none;
        border: none;
        color: var(--editor-text-secondary);
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: color 0.2s;
        flex-shrink: 0;
        margin-top: 8px;
      }

      .remove-btn:hover {
        color: #E57373;
      }

      .remove-btn svg {
        width: 16px;
        height: 16px;
      }

      .place-btn {
        padding: 4px 10px;
        border: 1px solid var(--editor-border);
        border-radius: 6px;
        background: transparent;
        color: var(--editor-text-secondary);
        font-size: 11px;
        cursor: pointer;
        transition: all 0.2s;
        white-space: nowrap;
      }

      .place-btn:hover {
        border-color: var(--editor-accent);
        color: var(--editor-accent);
      }

      .place-btn.active {
        background: var(--editor-accent);
        color: white;
        border-color: var(--editor-accent);
      }

      .map-preview {
        position: relative;
        border: 1px solid var(--editor-border);
        border-radius: 8px;
        overflow: hidden;
        margin-bottom: 12px;
        cursor: crosshair;
      }

      .map-preview img {
        width: 100%;
        display: block;
        opacity: 0.7;
      }

      .proxy-marker {
        position: absolute;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: var(--editor-accent);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 9px;
        font-weight: 700;
        transform: translate(-50%, -50%);
        border: 2px solid white;
        box-shadow: 0 1px 3px rgba(0,0,0,0.3);
        pointer-events: none;
      }

      .proxy-marker.placing {
        animation: pulse 1s ease-in-out infinite;
      }

      @keyframes pulse {
        0%, 100% { transform: translate(-50%, -50%) scale(1); }
        50% { transform: translate(-50%, -50%) scale(1.3); }
      }

      .placing-hint {
        position: absolute;
        bottom: 8px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0,0,0,0.7);
        color: white;
        padding: 4px 12px;
        border-radius: 12px;
        font-size: 12px;
        z-index: 10;
      }

      .zone-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
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

      .calibration-result {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 12px;
        background: rgba(76, 175, 80, 0.08);
        border: 1px solid rgba(76, 175, 80, 0.25);
        border-radius: 8px;
        font-size: 12px;
        color: #4CAF50;
        margin-top: 4px;
      }

      .calibration-result strong {
        color: var(--editor-text);
      }

      .calibration-map {
        border: 2px solid transparent;
        transition: border-color 0.2s;
      }

      /* Entity picker dropdown */
      .entity-picker {
        position: relative;
      }

      .entity-dropdown {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        max-height: 200px;
        overflow-y: auto;
        background: var(--editor-bg, #fff);
        border: 1px solid var(--editor-border);
        border-radius: 0 0 8px 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 100;
      }

      .entity-option {
        padding: 8px 10px;
        cursor: pointer;
        transition: background 0.15s;
        border-bottom: 1px solid var(--editor-border);
      }

      .entity-option:last-child {
        border-bottom: none;
      }

      .entity-option:hover {
        background: rgba(79, 195, 247, 0.08);
      }

      .entity-option.empty {
        color: var(--editor-text-secondary);
        font-style: italic;
        cursor: default;
      }

      .entity-option .entity-id {
        display: block;
        font-size: 11px;
        color: var(--editor-text);
        font-family: monospace;
      }

      .entity-option .entity-name {
        display: block;
        font-size: 10px;
        color: var(--editor-text-secondary);
        margin-top: 1px;
      }

      /* Discovered devices */
      .discovered-devices {
        padding: 10px;
        border: 1px solid rgba(76, 175, 80, 0.25);
        border-radius: 8px;
        background: rgba(76, 175, 80, 0.04);
        margin-bottom: 12px;
      }

      .discovered-list {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }

      .discovered-btn {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 4px 10px;
        border: 1px solid rgba(76, 175, 80, 0.3);
        border-radius: 16px;
        background: transparent;
        color: #4CAF50;
        font-size: 11px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .discovered-btn:hover {
        background: #4CAF50;
        color: white;
      }

      .discovered-btn svg {
        width: 14px;
        height: 14px;
      }
    `}render(){if(!this._config)return j;this.hass&&(this._lang=this.hass.selectedLanguage||this.hass.language||"en"),this._fullscreenEditor?this.classList.add("fullscreen-editor"):this.classList.remove("fullscreen-editor");const t=[{id:"floorplan",label:this._t("editor.floorplan")},{id:"proxies",label:this._t("editor.proxies")},{id:"zones",label:this._t("editor.zones")},{id:"devices",label:this._t("editor.devices")},{id:"appearance",label:this._t("editor.appearance")},{id:"history",label:this._t("editor.history")}];return N`
      <!-- Editor toolbar with expand button -->
      <div class="editor-toolbar">
        <span class="editor-toolbar-title">${this._t("editor.title")}</span>
        <button class="expand-btn" @click=${this._toggleFullscreenEditor}>
          <svg viewBox="0 0 24 24" fill="currentColor">
            ${this._fullscreenEditor?N`<path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>`:N`<path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>`}
          </svg>
          ${this._fullscreenEditor?this._t("editor.collapse_editor"):this._t("editor.expand_editor")}
        </button>
      </div>

      <div class="tabs">
        ${t.map(t=>N`
            <button
              class="tab ${this._activeSection===t.id?"active":""}"
              @click=${()=>this._activeSection=t.id}
            >
              ${t.label}
            </button>
          `)}
      </div>

      ${"floorplan"===this._activeSection?this._renderFloorplanSection():j}
      ${"proxies"===this._activeSection?this._renderProxiesSection():j}
      ${"zones"===this._activeSection?this._renderZonesSection():j}
      ${"devices"===this._activeSection?this._renderDevicesSection():j}
      ${"appearance"===this._activeSection?this._renderAppearanceSection():j}
      ${"history"===this._activeSection?this._renderHistorySection():j}
    `}};t([pt({attribute:!1})],Rt.prototype,"hass",void 0),t([_t()],Rt.prototype,"_config",void 0),t([_t()],Rt.prototype,"_activeSection",void 0),t([_t()],Rt.prototype,"_placingProxy",void 0),t([_t()],Rt.prototype,"_drawingZone",void 0),t([_t()],Rt.prototype,"_drawingPoints",void 0),t([_t()],Rt.prototype,"_calibrating",void 0),t([_t()],Rt.prototype,"_calibrationPoints",void 0),t([_t()],Rt.prototype,"_calibrationMeters",void 0),t([_t()],Rt.prototype,"_fullscreenEditor",void 0),t([_t()],Rt.prototype,"_entityFilter",void 0),t([_t()],Rt.prototype,"_deviceEntityFilter",void 0),t([_t()],Rt.prototype,"_showEntityDropdown",void 0),t([_t()],Rt.prototype,"_showDeviceEntityDropdown",void 0),Rt=t([ct(yt)],Rt),window.customCards=window.customCards||[],window.customCards.push({type:bt,name:"BLE LiveMap",description:"Real-time BLE device position tracking on your floor plan",preview:!0,documentationURL:"https://github.com/ToFinToFun/ha-ble-livemap"}),console.info(`%c BLE-LIVEMAP %c v${mt} `,"color: white; background: #4FC3F7; font-weight: bold; padding: 2px 6px; border-radius: 4px 0 0 4px;","color: #4FC3F7; background: #263238; font-weight: bold; padding: 2px 6px; border-radius: 0 4px 4px 0;");let Ht=class extends at{constructor(){super(...arguments),this._devices=[],this._activeFloor=null,this._isFullscreen=!1,this._imageLoaded={},this._imageError={},this._showDevicePanel=!1,this._runtimeShowProxies=null,this._runtimeShowZones=null,this._runtimeShowZoneLabels=null,this._canvases=new Map,this._images=new Map,this._historyStore=null,this._animationFrame=null,this._updateTimer=null,this._previousPositions=new Map,this._lang="en",this._resizeObserver=null}static getConfigElement(){return document.createElement(yt)}static getStubConfig(){return{type:`custom:${bt}`,floorplan_image:"",tracked_devices:[],proxies:[]}}setConfig(t){this._config={...gt,...t},this._config.history_enabled&&(this._historyStore=new Dt(this._config.history_retention||60,this._config.history_trail_length||50));const e=this._getFloors();e.length>0&&!this._activeFloor&&(this._activeFloor=t.active_floor||e[0].id)}connectedCallback(){super.connectedCallback(),this._startUpdateLoop()}disconnectedCallback(){super.disconnectedCallback(),this._stopUpdateLoop(),this._stopRenderLoop(),this._resizeObserver?.disconnect()}firstUpdated(t){super.firstUpdated(t),this._setupResizeObserver(),this._startRenderLoop()}updated(t){super.updated(t),t.has("hass")&&this.hass&&(this._lang=this.hass.selectedLanguage||this.hass.language||"en"),this._updateCanvasRefs()}getCardSize(){return 6}_startUpdateLoop(){const t=1e3*(this._config?.update_interval||2);this._updateTimer=window.setInterval(()=>this._updateDevices(),t),this._updateDevices()}_stopUpdateLoop(){this._updateTimer&&(clearInterval(this._updateTimer),this._updateTimer=null)}_updateDevices(){if(!this.hass||!this._config?.tracked_devices)return;const t=[],e=this._getAllProxies();for(const i of this._config.tracked_devices){const o=this._getDeviceDistances(i,e);let s=null;if(o.length>=1){const t=new Map;for(const i of o){const o=e.find(t=>t.entity_id===i.proxy_entity_id);o&&t.set(i.proxy_entity_id,{x:o.x,y:o.y})}if(t.size>=1){const e=this._getFloors()[0],n=xt(t,o,0,0,e?.image_width||20,e?.image_height||15);if(n){const t=i.entity_prefix||"",e=this._previousPositions.get(t),o=$t(n,e?{x:e.x,y:e.y,accuracy:e.accuracy,confidence:e.confidence}:null,.3);o&&(s={x:o.x,y:o.y,accuracy:o.accuracy,confidence:o.confidence,timestamp:Date.now()},this._previousPositions.set(t,s))}}}let n=null;if(o.length>0){const t=o.reduce((t,e)=>t.distance<e.distance?t:e),i=e.find(e=>e.entity_id===t.proxy_entity_id);n=i?.name||i?.entity_id||null}const r=i.entity_prefix||i.bermuda_device_id||"";let a=this._historyStore?.getTrail(r)||[];s&&this._historyStore&&(this._historyStore.addPoint(r,{x:s.x,y:s.y,timestamp:s.timestamp}),a=this._historyStore.getTrail(r)),t.push({device_id:r,name:i.name,position:s,history:a,distances:o,nearest_proxy:n,area:null,last_seen:s?Date.now():0,config:i})}this._devices=t,function(t){const e=new Set(t);for(const t of wt.keys())e.has(t)||wt.delete(t)}(t.map(t=>t.device_id))}_getDeviceDistances(t,e){if(!this.hass)return[];const i=t.entity_prefix,o=[];if(i)for(const t of e){const e=t.entity_id.replace(/^.*\./,"").replace(/_proxy$/,""),s=[`${i}_${e}_distance`,`${i}_distance_${e}`];for(const e of s){const i=this.hass.states[e];if(i&&!isNaN(parseFloat(i.state))){const e=parseFloat(i.state),s=i.attributes||{};o.push({proxy_entity_id:t.entity_id,distance:e,rssi:s.rssi||-80,timestamp:new Date(i.last_updated).getTime()});break}}}if(0===o.length&&i){const t=`${i}_distance`,s=this.hass.states[t];if(s){const t=s.attributes||{};if(t.scanners)for(const[i,s]of Object.entries(t.scanners)){const t=e.find(t=>t.entity_id===i||t.name===s?.name);t&&s?.distance&&o.push({proxy_entity_id:t.entity_id,distance:s.distance,rssi:s.rssi||-80,timestamp:Date.now()})}}}if(0===o.length&&i){const t=i.replace("sensor.bermuda_","device_tracker.bermuda_"),s=this.hass.states[t];if(s?.attributes?.scanners)for(const[t,i]of Object.entries(s.attributes.scanners)){const s=e.find(e=>e.entity_id===t);s&&i?.distance&&o.push({proxy_entity_id:s.entity_id,distance:i.distance,rssi:i.rssi||-80,timestamp:Date.now()})}}return o}_findEntity(t,e){if(!this.hass||!t.entity_prefix)return null;const i=`${t.entity_prefix}_${e}`;return this.hass.states[i]?i:null}_getAllProxies(){if(!this._config)return[];const t=this._config.proxies||[],e=[];for(const t of this._getFloors())t.proxies&&e.push(...t.proxies);return[...t,...e]}_getProxiesForFloor(t){if(!this._config)return[];const e=(this._config.proxies||[]).filter(e=>!e.floor_id||e.floor_id===t),i=this._getFloors().find(e=>e.id===t);return[...e,...i?.proxies||[]]}_getZonesForFloor(t){return(this._config.zones||[]).filter(e=>!e.floor_id||e.floor_id===t)}_getFloors(){const t=this._config?.floors||[];return 0===t.length&&this._config?.floorplan_image?[{id:"default",name:"Floor 1",image:this._config.floorplan_image,image_width:20,image_height:15}]:t}_getActiveFloor(){const t=this._getFloors();return t.find(t=>t.id===this._activeFloor)||t[0]||null}_getFloorplanImage(){const t=this._getActiveFloor();return t?.image||this._config?.floorplan_image||""}_isStackedMode(){return"stacked"===this._config?.floor_display_mode&&this._getFloors().length>1}_updateCanvasRefs(){const t=this.shadowRoot;if(!t)return;const e=t.querySelectorAll("canvas[data-floor-id]"),i=t.querySelectorAll("img[data-floor-id]");e.forEach(t=>{const e=t.dataset.floorId||"";this._canvases.set(e,t)}),i.forEach(t=>{const e=t.dataset.floorId||"";this._images.set(e,t)})}_setupResizeObserver(){this._resizeObserver=new ResizeObserver(()=>{this._resizeAllCanvases()});const t=this.shadowRoot?.querySelectorAll(".map-container");t?.forEach(t=>{this._resizeObserver.observe(t)})}_resizeAllCanvases(){for(const[t,e]of this._canvases.entries()){const i=this._images.get(t);if(!e||!i)continue;const o=e.parentElement;if(!o)continue;const s=o.clientWidth;if(0===s||!i.naturalWidth||!i.naturalHeight)continue;const n=s,r=s/(i.naturalWidth/i.naturalHeight),a=window.devicePixelRatio||1;e.width=n*a,e.height=r*a,e.style.width=`${n}px`,e.style.height=`${r}px`}}_startRenderLoop(){const t=()=>{this._renderAllCanvases(),this._animationFrame=requestAnimationFrame(t)};this._animationFrame=requestAnimationFrame(t)}_stopRenderLoop(){this._animationFrame&&(cancelAnimationFrame(this._animationFrame),this._animationFrame=null)}_renderAllCanvases(){const t=this._isDarkMode(),e={...this._config,show_proxies:this._runtimeShowProxies??this._config.show_proxies,show_zones:this._runtimeShowZones??this._config.show_zones,show_zone_labels:this._runtimeShowZoneLabels??this._config.show_zone_labels};if(this._isStackedMode())for(const i of this._getFloors())this._renderFloorCanvas(i.id,e,t);else{const i=this._getActiveFloor();i&&this._renderFloorCanvas(i.id,e,t)}}_renderFloorCanvas(t,e,i){const o=this._canvases.get(t);if(!o)return;const s=o.getContext("2d");if(!s)return;const n=window.devicePixelRatio||1,r=o.width/n,a=o.height/n;if(0===r||0===a)return;const l=this._getProxiesForFloor(t),c=this._getZonesForFloor(t);Ct({ctx:s,width:r,height:a,dpr:n,isDark:i},this._devices,l,c,e,t)}_isDarkMode(){return"dark"===this._config?.theme_mode||"light"!==this._config?.theme_mode&&(this.hass?.themes?.darkMode??!1)}_handleImageLoad(t){this._imageLoaded={...this._imageLoaded,[t]:!0},this._imageError={...this._imageError,[t]:!1},requestAnimationFrame(()=>{this._updateCanvasRefs(),this._resizeAllCanvases(),this._resizeObserver?.disconnect(),this._setupResizeObserver()})}_handleImageError(t){this._imageError={...this._imageError,[t]:!0},this._imageLoaded={...this._imageLoaded,[t]:!1}}_handleFloorChange(t){const e=t.target;this._activeFloor=e.value}_toggleFullscreen(){this._isFullscreen=!this._isFullscreen,this._isFullscreen?this.requestFullscreen?.():document.exitFullscreen?.()}_toggleDevicePanel(){this._showDevicePanel=!this._showDevicePanel}_toggleProxies(){const t=this._runtimeShowProxies??this._config.show_proxies??!0;this._runtimeShowProxies=!t}_toggleZones(){const t=this._runtimeShowZones??this._config.show_zones??!0;this._runtimeShowZones=!t}_toggleZoneLabels(){const t=this._runtimeShowZoneLabels??this._config.show_zone_labels??!0;this._runtimeShowZoneLabels=!t}_renderFloorMap(t){const e=this._imageLoaded[t.id]||!1,i=this._imageError[t.id]||!1;return N`
      <div class="map-container" data-floor-id="${t.id}">
        ${this._isStackedMode()?N`<div class="floor-label">${t.name}</div>`:j}
        <img
          data-floor-id="${t.id}"
          src=${t.image}
          @load=${()=>this._handleImageLoad(t.id)}
          @error=${()=>this._handleImageError(t.id)}
          alt="${t.name}"
          crossorigin="anonymous"
        />
        ${e?N`<canvas data-floor-id="${t.id}"></canvas>`:j}
        ${i?N`<div class="empty-state"><p>Failed to load: ${t.image}</p></div>`:j}
      </div>
    `}static get styles(){return r`
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
    `}render(){if(!this._config)return j;const t=this._getFloors(),e=t.length>1,i=this._isStackedMode(),o=this._config.card_title||"BLE LiveMap",s=t=>Lt(t,this._lang),n=t.some(t=>t.image);return N`
      <ha-card>
        <!-- Header -->
        <div class="card-header">
          <div class="card-title">
            <span class="dot"></span>
            ${o}
          </div>
          <div class="header-actions">
            ${e&&!i?N`
                  <select class="floor-select" @change=${this._handleFloorChange}>
                    ${t.map(t=>N`
                        <option value=${t.id} ?selected=${t.id===this._activeFloor}>
                          ${t.name}
                        </option>
                      `)}
                  </select>
                `:j}
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
            ${(this._config.zones?.length||0)>0?N`
                  <button
                    class="header-btn ${this._runtimeShowZones??this._config.show_zones??1?"":"off"}"
                    @click=${this._toggleZones}
                    title="${s("card.toggle_zones")}"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z"/>
                    </svg>
                  </button>
                `:j}
            <button class="header-btn" @click=${this._toggleDevicePanel} title="Devices">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            </button>
            ${this._config.fullscreen_enabled?N`
                  <button class="header-btn" @click=${this._toggleFullscreen} title="${s("card.fullscreen")}">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
                    </svg>
                  </button>
                `:j}
          </div>
        </div>

        <!-- Maps -->
        ${n?N`
              <div class="maps-wrapper">
                ${i?t.map((t,e)=>N`
                        ${e>0?N`<div class="floor-divider"></div>`:j}
                        ${this._renderFloorMap(t)}
                      `):this._getActiveFloor()?this._renderFloorMap(this._getActiveFloor()):j}
              </div>
            `:N`
              <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zM5 15h14v3H5z"/>
                </svg>
                <p>${s("common.no_floorplan")}</p>
              </div>
            `}

        <!-- Device Panel -->
        <div class="device-panel ${this._showDevicePanel?"":"collapsed"}">
          ${this._devices.map(t=>N`
              <div class="device-item">
                <div class="device-dot" style="background: ${t.config.color}"></div>
                <div class="device-info">
                  <div class="device-name">${t.name}</div>
                  <div class="device-detail">
                    ${t.area||t.nearest_proxy||s("common.unknown")}
                  </div>
                </div>
                <div class="device-accuracy">
                  ${t.position?N`
                        <div>${t.position.accuracy.toFixed(1)}m</div>
                        <div>${Math.round(100*t.position.confidence)}%</div>
                      `:N`<div>--</div>`}
                </div>
              </div>
            `)}
        </div>

        <!-- Status Bar -->
        <div class="status-bar">
          <div class="status-left">
            <div class="status-item">
              <span class="count">${this._devices.filter(t=>t.position).length}</span>
              ${s("card.devices_tracked")}
            </div>
            <div class="status-item">
              <span class="count">${this._getAllProxies().length}</span>
              ${s("card.proxies_active")}
            </div>
          </div>
          <div>v${mt}</div>
        </div>
      </ha-card>
    `}};t([pt({attribute:!1})],Ht.prototype,"hass",void 0),t([_t()],Ht.prototype,"_config",void 0),t([_t()],Ht.prototype,"_devices",void 0),t([_t()],Ht.prototype,"_activeFloor",void 0),t([_t()],Ht.prototype,"_isFullscreen",void 0),t([_t()],Ht.prototype,"_imageLoaded",void 0),t([_t()],Ht.prototype,"_imageError",void 0),t([_t()],Ht.prototype,"_showDevicePanel",void 0),t([_t()],Ht.prototype,"_runtimeShowProxies",void 0),t([_t()],Ht.prototype,"_runtimeShowZones",void 0),t([_t()],Ht.prototype,"_runtimeShowZoneLabels",void 0),Ht=t([ct(bt)],Ht);export{Ht as BLELivemapCard};
