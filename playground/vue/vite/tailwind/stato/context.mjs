import*as p from"vue";import{defineComponent as y,ref as i,shallowRef as d,h as m,Suspense as h,nextTick as w,createApp as R}from"vue";import{compileTemplate as $}from"vue/compiler-sfc";function f(t,o){import.meta.hot&&import.meta.hot.on(t,o)}const{defineComponent:c,h:b,shallowRef:j,toRaw:k,toRef:O,watch:S}=p,x=c({name:"StoryRenderer",props:{story:{type:Object,default:{}}},async setup(t){const o=j(c({}));function l(){const n=t.story.components?k(t.story.components):{},u=new Function("Vue",$({source:t.story.template??"<div></div>",compilerOptions:{mode:"function"},id:"story",filename:"anonymous.vue"}).code)(p);o.value=c({name:"Story",components:n,setup(){const e=t.story.setup?t.story.setup():null;return u.bind(this,e)}})}const s=O(t,"story");return S(s,l,{immediate:!0}),()=>b(o.value)}}),C=y({setup(){const t=i(null),o=i(null),l=i(null),s=i(null),n=d({});async function u(e,r){const a=Date.now();return r===".js"?import(`./stories/${e}.stories.js?t=${a}`):import(`./stories/${e}.stories.ts?t=${a}`)}return f("stato-iframe:select-story",async({bookName:e,storyName:r,ext:a})=>{if(t.value!==e){const{default:v}=await u(e,a);s.value=v,o.value=a,t.value=e}l.value=r,n.value=s.value.stories[r]}),f("stato-iframe:re-import",async()=>{if(t.value===null||o.value===null)return;const{default:e}=await u(t.value,o.value);s.value=e,n.value={},w(()=>{n.value=e.stories[l.value]})}),()=>m("main",null,m(h,null,{default:[m(x,{story:n.value})],fallback:[m("div",null)]}))}});R(C).mount("#iframe");
