import Shell from '@/components/Shell';import ResourcePage from '@/components/ResourcePage';import {titles} from '@/lib/config';
export default function Page({params}:{params:{section:string}}){const section=params.section;return <Shell role="admin" title={titles[section]||section.replaceAll('-',' ')}><ResourcePage role="admin" section={section}/></Shell>}
