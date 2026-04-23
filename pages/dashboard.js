import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import Navbar from "../components/Navbar";
import StatCard from "../components/StatCard";
import TopicCard from "../components/TopicCard";

const SENT_COLORS = { positive: "#10b981", negative: "#ef4444", neutral: "#6b7a99" };
const CHART_COLORS = ["#00d4ff","#f59e0b","#10b981","#ff4d6d","#7c3aed","#a78bfa","#ec4899","#06b6d4","#84cc16","#f97316"];

// ── Helpers ───────────────────────────────────────────────────────────────────
function SentBadge({ s }) {
  const map = { positive:["#10b98122","#10b981","😊"], negative:["#ef444422","#ef4444","😤"], neutral:["#6b7a9922","#94a3b8","😐"] };
  const [bg,col,em] = map[s]||map.neutral;
  return <span style={{background:bg,color:col,border:`1px solid ${col}44`,borderRadius:20,padding:"2px 8px",fontSize:11,fontWeight:700}}>{em} {s}</span>;
}

function ViralityMeter({ score, label, reasoning }) {
  const color = score>=75?"#ff4d6d":score>=55?"#f59e0b":score>=35?"#00d4ff":"#6b7a99";
  return (
    <div className="card" style={{borderLeft:`3px solid ${color}`,padding:"14px 16px"}}>
      <div style={{display:"flex",alignItems:"center",gap:14}}>
        <div style={{textAlign:"center",minWidth:60}}>
          <div style={{fontSize:28,fontWeight:800,fontFamily:"var(--font-display)",color,lineHeight:1}}>{score}</div>
          <div style={{fontSize:10,color:"var(--text-muted)"}}>/ 100</div>
        </div>
        <div style={{flex:1}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
            <span style={{fontFamily:"var(--font-display)",fontWeight:800,fontSize:14,color}}>{label}</span>
            <span style={{fontSize:11,color:"var(--text-muted)"}}>Virality Score</span>
          </div>
          <div className="progress-bar" style={{marginBottom:6}}>
            <div className="progress-fill" style={{width:`${score}%`,background:`linear-gradient(90deg,${color},${color}88)`}}/>
          </div>
          <div style={{fontSize:12,color:"var(--text-muted)"}}>{reasoning}</div>
        </div>
      </div>
    </div>
  );
}

function ActionStep({ step }) {
  const pc={high:"#ef4444",medium:"#f59e0b",low:"#10b981"}[step.priority]||"#6b7a99";
  return (
    <div className="card" style={{padding:"12px 14px",display:"flex",gap:10}}>
      <div style={{fontSize:20}}>{step.icon}</div>
      <div style={{flex:1}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
          <span style={{fontFamily:"var(--font-display)",fontWeight:700,fontSize:13}}>{step.title}</span>
          <span style={{fontSize:10,background:`${pc}22`,color:pc,border:`1px solid ${pc}44`,borderRadius:10,padding:"1px 8px",fontWeight:700,textTransform:"uppercase"}}>{step.priority}</span>
        </div>
        <div style={{fontSize:12,color:"var(--text-muted)"}}>{step.detail}</div>
        {(step.evidence||[]).length>0&&(
          <div style={{marginTop:10,display:"flex",flexDirection:"column",gap:6}}>
            {(step.evidence||[]).slice(0,2).map((evidence,index)=>(
              <div key={`${evidence.author}-${index}`} style={{background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:6,padding:"8px 10px"}}>
                <div style={{fontSize:10,color:"var(--text-muted)",marginBottom:4}}>@{evidence.author} · ðŸ‘ {evidence.likeCount||0}</div>
                <div style={{fontSize:11,color:"var(--text)",lineHeight:1.5}}>
                  "{evidence.text}{evidence.text?.length>=140?"â€¦":""}"
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Demand Comment Card ───────────────────────────────────────────────────────
function DemandCard({ c, showVideo = false }) {
  const sentColor = { positive:"#10b981", negative:"#ef4444", neutral:"#6b7a99" }[c.sentiment]||"#6b7a99";
  const subtopicColors = {
    smartphone_cameras:"#ff6b9d", smartphone_battery:"#ffd700", smartphone_performance:"#ff4500",
    smartphone_display:"#7c3aed", smartphone_software:"#10b981", smartphone_comparison:"#f59e0b",
    smartphone_connectivity:"#06b6d4", smartphone_pricing:"#ec4899",
    programming_tutorials:"#3b82f6", ai_ml:"#8b5cf6", general_tech:"#94a3b8",
  };
  const stColor = subtopicColors[c.subtopic]||"#00d4ff";
  const weight = Number(c.demandScore || 0);

  return (
    <div style={{
      background:"var(--bg2)", border:"1px solid var(--border)", borderRadius:"var(--radius)",
      padding:"12px 14px", borderLeft:`3px solid ${stColor}`,
      transition:"border-color 0.2s",
    }}>
      {/* Video source */}
      {showVideo && c.videoTitle && (
        <div style={{fontSize:10,color:"var(--text-dim)",marginBottom:6,display:"flex",alignItems:"center",gap:6}}>
          {c.videoThumbnail && <img src={c.videoThumbnail} alt="" style={{width:28,height:16,objectFit:"cover",borderRadius:2,flexShrink:0}}/>}
          <span style={{overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>
            {c.videoChannel && <span style={{color:"var(--accent)",fontWeight:700}}>{c.videoChannel}</span>}
            {c.videoChannel && " · "}
            {c.videoTitle?.slice(0,60)}{c.videoTitle?.length>60?"…":""}
          </span>
        </div>
      )}

      {/* Author + meta */}
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,flexWrap:"wrap"}}>
        <span style={{
          background:`${stColor}22`,
          color:stColor,
          border:`1px solid ${stColor}44`,
          borderRadius:10,
          padding:"2px 8px",
          fontSize:11,
          fontWeight:800,
        }}>
          Weight: {weight}
        </span>
        <span style={{fontSize:12,fontWeight:700,color:"var(--text-muted)"}}>@{c.author}</span>
        <SentBadge s={c.sentiment}/>
        {c.subtopic && (
          <span style={{fontSize:10,background:`${stColor}22`,color:stColor,border:`1px solid ${stColor}44`,borderRadius:10,padding:"1px 7px",fontWeight:700}}>
            {c.subtopic.replace(/_/g," ")}
          </span>
        )}
        <span style={{marginLeft:"auto",fontSize:11,color:"var(--accent4)",fontWeight:700}}>👍 {c.likeCount}</span>
        {c.replyCount>0&&<span style={{fontSize:11,color:"var(--text-muted)"}}>💬 {c.replyCount}</span>}
      </div>

      {/* Comment text with demand phrases highlighted */}
      <div style={{fontSize:13,color:"var(--text)",lineHeight:1.6}}>
        {highlightDemandPhrases(c.text, c.demandMatches)}
      </div>

      {/* Demand phrase badges */}
      {(c.demandMatches||[]).length>0 && (
        <div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:8}}>
          {(c.demandMatches||[]).slice(0,3).map(m=>(
            <span key={m} style={{fontSize:10,background:"#10b98122",color:"var(--green)",border:"1px solid #10b98144",borderRadius:4,padding:"2px 7px",fontWeight:700}}>
              🎯 "{m}"
            </span>
          ))}
        </div>
      )}

      {/* Date */}
      {c.publishedAt && (
        <div style={{marginTop:6,fontSize:10,color:"var(--text-dim)"}}>
          {new Date(c.publishedAt).toLocaleDateString()}
        </div>
      )}
    </div>
  );
}

// Highlight demand phrases in comment text
function highlightDemandPhrases(text, matches) {
  if (!text || !matches?.length) return text;
  let result = text;
  const parts = [];
  let lower = result.toLowerCase();
  let lastIdx = 0;

  // Find first match
  let bestMatch = null, bestIdx = Infinity;
  for (const m of matches) {
    const idx = lower.indexOf(m.toLowerCase());
    if (idx !== -1 && idx < bestIdx) { bestIdx = idx; bestMatch = m; }
  }

  if (!bestMatch || bestIdx === Infinity) return text;

  parts.push(text.slice(0, bestIdx));
  parts.push(
    <mark key="m" style={{background:"#10b98133",color:"var(--green)",borderRadius:3,padding:"0 2px",fontWeight:700}}>
      {text.slice(bestIdx, bestIdx+bestMatch.length)}
    </mark>
  );
  parts.push(text.slice(bestIdx+bestMatch.length));
  return parts;
}

// ── Demand Comments Panel ─────────────────────────────────────────────────────
function formatTopicLabel(topic) {
  if (!topic) return "General";
  return topic
    .replace(/^smartphone_/, "")
    .replace(/^programming_/, "")
    .replace(/^ai_/, "ai ")
    .replace(/_/g, " ")
    .replace(/\b\w/g, char => char.toUpperCase());
}

function buildDemandTopicChartData(comments) {
  return Object.values((comments || []).reduce((acc, comment) => {
    const key = comment.subtopic || comment.topicKey || comment.label || "general";
    if (!acc[key]) acc[key] = { key, label: formatTopicLabel(key), count: 0, demandScore: 0 };
    acc[key].count += 1;
    acc[key].demandScore += Number(comment.demandScore || 0);
    return acc;
  }, {}))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return b.demandScore - a.demandScore;
    })
    .slice(0, 6);
}

function buildSentimentChartData(comments, sentimentStats) {
  if (sentimentStats) {
    return [
      { name: "Positive", value: sentimentStats.positive || 0, color: SENT_COLORS.positive },
      { name: "Negative", value: sentimentStats.negative || 0, color: SENT_COLORS.negative },
      { name: "Neutral", value: sentimentStats.neutral || 0, color: SENT_COLORS.neutral },
    ];
  }

  const totals = (comments || []).reduce((acc, comment) => {
    const key = comment.sentiment || "neutral";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, { positive: 0, negative: 0, neutral: 0 });

  return [
    { name: "Positive", value: totals.positive || 0, color: SENT_COLORS.positive },
    { name: "Negative", value: totals.negative || 0, color: SENT_COLORS.negative },
    { name: "Neutral", value: totals.neutral || 0, color: SENT_COLORS.neutral },
  ];
}

function DemandTopicChart({ comments }) {
  const data = buildDemandTopicChartData(comments);

  if (!data.length) return null;

  return (
    <div className="card" style={{padding:"16px 18px",minHeight:320}}>
      <div style={{fontSize:10,color:"var(--text-muted)",letterSpacing:"0.12em",textTransform:"uppercase",fontFamily:"var(--font-display)",fontWeight:700,marginBottom:6}}>
        Demand By Topic
      </div>
      <div style={{fontSize:12,color:"var(--text-muted)",marginBottom:14}}>
        Most requested themes across the current demand comments
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 22 }}>
          <XAxis dataKey="label" tick={{fontSize:10,fill:"#94a3b8"}} interval={0} angle={-8} textAnchor="end" height={52} />
          <YAxis tick={{fontSize:10,fill:"#94a3b8"}} allowDecimals={false} />
          <Tooltip
            cursor={{fill:"rgba(148,163,184,0.08)"}}
            contentStyle={{background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:10,fontSize:11}}
            formatter={(value, name, item) => name === "count" ? [`${value} comments`, item.payload.label] : [value, name]}
            labelFormatter={label => label}
          />
          <Bar dataKey="count" radius={[8, 8, 0, 0]}>
            {data.map((entry, index) => <Cell key={entry.key} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function SentimentDonut({ comments, sentimentStats }) {
  const data = buildSentimentChartData(comments, sentimentStats);
  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (!data.length) return null;

  return (
    <div className="card" style={{padding:"16px 18px",minHeight:320}}>
      <div style={{fontSize:10,color:"var(--text-muted)",letterSpacing:"0.12em",textTransform:"uppercase",fontFamily:"var(--font-display)",fontWeight:700,marginBottom:6}}>
        Sentiment Analysis
      </div>
      <div style={{fontSize:12,color:"var(--text-muted)",marginBottom:14}}>
        Circular breakdown of positive, negative, and neutral demand comments
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12,alignItems:"center"}}>
        <div style={{position:"relative",height:220}}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={58} outerRadius={84} paddingAngle={3} dataKey="value" stroke="none">
                {data.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
              </Pie>
              <Tooltip
                contentStyle={{background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:10,fontSize:11}}
                formatter={(value, _name, item) => {
                  const pct = Math.round((Number(value || 0) / Math.max(1, total)) * 100);
                  return [`${value} comments (${pct}%)`, item?.payload?.name || "Sentiment"];
                }}
                labelFormatter={() => "Sentiment"}
              />
            </PieChart>
          </ResponsiveContainer>
          <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none",flexDirection:"column"}}>
            <div style={{fontFamily:"var(--font-display)",fontWeight:800,fontSize:30,lineHeight:1,color:"var(--text)"}}>{total}</div>
            <div style={{fontSize:11,color:"var(--text-muted)"}}>comments</div>
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {data.map((item) => {
            const pct = Math.round((item.value / Math.max(1, total)) * 100);
            return (
              <div key={item.name} style={{background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:10,padding:"10px 12px"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,marginBottom:6}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{width:10,height:10,borderRadius:"50%",background:item.color,display:"inline-block"}} />
                    <span style={{fontSize:12,fontWeight:700,color:"var(--text)"}}>{item.name}</span>
                  </div>
                  <span style={{fontSize:12,color:item.color,fontWeight:800}}>{pct}%</span>
                </div>
                <div className="progress-bar" style={{height:6,marginBottom:6}}>
                  <div className="progress-fill" style={{width:`${pct}%`,background:item.color}} />
                </div>
                <div style={{fontSize:11,color:"var(--text-muted)"}}>{item.value} comments</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DemandPanel({ comments, showVideo = false, title = "🎯 Demand Comments", sentimentStats = null }) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("likes");
  const [page, setPage] = useState(0);
  const PER_PAGE = 20;

  const SUBTOPICS = [...new Set((comments||[]).map(c=>c.subtopic).filter(Boolean))];

  let filtered = (comments||[]).filter(c => {
    if (filter!=="all" && c.subtopic!==filter) return false;
    if (!search) return true;
    return c.text?.toLowerCase().includes(search.toLowerCase()) ||
           c.author?.toLowerCase().includes(search.toLowerCase()) ||
           c.videoTitle?.toLowerCase().includes(search.toLowerCase());
  });

  if (sort==="likes")  filtered = [...filtered].sort((a,b)=>(b.likeCount||0)-(a.likeCount||0));
  if (sort==="demand") filtered = [...filtered].sort((a,b)=>(b.demandScore||0)-(a.demandScore||0));
  if (sort==="date")   filtered = [...filtered].sort((a,b)=>new Date(b.publishedAt||0)-new Date(a.publishedAt||0));

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice(page*PER_PAGE, (page+1)*PER_PAGE);

  return (
    <div>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,flexWrap:"wrap",gap:8}}>
        <div>
          <span style={{fontFamily:"var(--font-display)",fontWeight:800,fontSize:16}}>{title}</span>
          <span style={{marginLeft:10,fontSize:12,color:"var(--text-muted)"}}>{filtered.length} of {(comments||[]).length} shown</span>
        </div>
      </div>

      {filtered.length > 0 && (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:14,marginBottom:16}}>
          <DemandTopicChart comments={filtered} />
          <SentimentDonut comments={filtered} sentimentStats={sentimentStats} />
        </div>
      )}

      {/* Controls */}
      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
        {/* Search */}
        <input className="input" placeholder="🔍 Search comments, authors, videos…" value={search} onChange={e=>{setSearch(e.target.value);setPage(0);}} style={{flex:1,minWidth:200,fontSize:12}}/>

        {/* Sort */}
        <select value={sort} onChange={e=>setSort(e.target.value)} style={{background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:"var(--radius)",color:"var(--text)",fontFamily:"var(--font-mono)",fontSize:12,padding:"8px 12px",cursor:"pointer"}}>
          <option value="likes">Sort: Most Liked</option>
          <option value="demand">Sort: Demand Score</option>
          <option value="date">Sort: Newest</option>
        </select>
      </div>

      {/* Subtopic filter chips */}
      {SUBTOPICS.length>1 && (
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:14}}>
          <button onClick={()=>{setFilter("all");setPage(0);}} className="btn" style={{fontSize:11,padding:"4px 12px",background:filter==="all"?"var(--accent)":"var(--bg3)",color:filter==="all"?"var(--bg)":"var(--text-muted)",border:"1px solid var(--border)"}}>All</button>
          {SUBTOPICS.map(st=>{
            const stColors={"smartphone_cameras":"#ff6b9d","smartphone_battery":"#ffd700","smartphone_performance":"#ff4500","smartphone_display":"#7c3aed","smartphone_software":"#10b981","smartphone_comparison":"#f59e0b","smartphone_connectivity":"#06b6d4","smartphone_pricing":"#ec4899","general_tech":"#94a3b8"};
            const c=stColors[st]||"#00d4ff";
            return (
              <button key={st} onClick={()=>{setFilter(st===filter?"all":st);setPage(0);}} className="btn" style={{fontSize:11,padding:"4px 12px",background:filter===st?`${c}22`:"var(--bg3)",color:filter===st?c:"var(--text-muted)",border:`1px solid ${filter===st?c:"var(--border)"}`}}>
                {st.replace(/_/g," ")}
              </button>
            );
          })}
        </div>
      )}

      {/* Cards */}
      {paged.length===0 ? (
        <div className="card" style={{textAlign:"center",color:"var(--text-muted)",padding:40}}>
          No demand comments match your filters.
        </div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {paged.map((c,i)=><DemandCard key={c.commentId||i} c={c} showVideo={showVideo}/>)}
        </div>
      )}

      {/* Pagination */}
      {totalPages>1 && (
        <div style={{display:"flex",gap:8,justifyContent:"center",marginTop:16,alignItems:"center"}}>
          <button className="btn btn-secondary" disabled={page===0} onClick={()=>setPage(p=>p-1)} style={{fontSize:12}}>← Prev</button>
          <span style={{fontSize:12,color:"var(--text-muted)"}}>Page {page+1} of {totalPages}</span>
          <button className="btn btn-secondary" disabled={page>=totalPages-1} onClick={()=>setPage(p=>p+1)} style={{fontSize:12}}>Next →</button>
        </div>
      )}
    </div>
  );
}

// ── Channels Dashboard ─────────────────────────────────────────────────────────
function ChannelsDashboard({ data, onExport, exporting }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("Topics");
  const [selectedVideo, setSelectedVideo] = useState(null);
  const { channels, videos, aggregate, allDemandComments, skippedChannels } = data;
  const TABS = ["Topics","Comments","Videos","Channels"];
  const rankedTopics = (videos || [])
    .filter(v => !v.error)
    .flatMap(v => (v.topics || []).map(topic => ({
      ...topic,
      topicKey: `${v.videoId || v.metadata?.videoId || v.title}-${topic.topicKey}`,
      sampleComments: topic.sampleComments || [],
    })))
    .sort((a, b) => (b.weightedScore || 0) - (a.weightedScore || 0));

  const sentStats = aggregate?.sentimentStats||{};
  const posRate = Math.round(((sentStats.positive||0)/Math.max(1,sentStats.total))*100);
  const negRate = Math.round(((sentStats.negative||0)/Math.max(1,sentStats.total))*100);
  const sentPie = [
    {name:"Positive",value:sentStats.positive||0,color:"#10b981"},
    {name:"Negative",value:sentStats.negative||0,color:"#ef4444"},
    {name:"Neutral", value:sentStats.neutral||0, color:"#6b7a99"},
  ].filter(d=>d.value>0);

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
        <div>
          <h2 style={{fontFamily:"var(--font-display)",fontSize:20,marginBottom:4}}>
            📡 Channel Analysis — Last {aggregate?.daysBack||7} Days
          </h2>
          <div style={{fontSize:12,color:"var(--text-muted)"}}>
            {channels?.length} channels · {aggregate?.totalVideos} videos · {(aggregate?.totalComments||0).toLocaleString()} comments · <span style={{color:"var(--green)",fontWeight:700}}>{aggregate?.totalDemand||0} demand signals</span>
          </div>
        </div>
        <button className="btn btn-secondary" onClick={()=>router.push("/")} style={{fontSize:11}}>← Home</button>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:4,marginBottom:20,borderBottom:"1px solid var(--border)"}}>
        {TABS.map(t=>(
          <button key={t} onClick={()=>setActiveTab(t)} style={{padding:"10px 16px",border:"none",background:"transparent",color:activeTab===t?"var(--accent)":"var(--text-muted)",fontFamily:"var(--font-display)",fontWeight:700,fontSize:12,cursor:"pointer",borderBottom:activeTab===t?"2px solid var(--accent)":"2px solid transparent",marginBottom:-1,whiteSpace:"nowrap"}}>
            {t}{t==="Comments"&&allDemandComments?.length>0?` (${allDemandComments.length})`:""}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:12,marginBottom:20}}>
        <StatCard label="Videos" value={aggregate?.totalVideos||0} icon="🎬" color="var(--accent)"/>
        <StatCard label="Comments" value={(aggregate?.totalComments||0).toLocaleString()} icon="💬" color="var(--text)"/>
        <StatCard label="Demand" value={aggregate?.totalDemand||0} icon="🎯" color="var(--green)"/>
        <StatCard label="😊 Positive" value={`${posRate}%`} icon="😊" color="#10b981"/>
        <StatCard label="😤 Negative" value={`${negRate}%`} icon="😤" color="#ef4444"/>
        <StatCard label="Channels" value={channels?.length||0} icon="📡" color="#f59e0b"/>
      </div>

      {/* ── OVERVIEW ─────────────────────────────────────────────────────── */}
      {(skippedChannels || []).length > 0 && (
        <div className="card" style={{marginBottom:20,borderLeft:"3px solid #f59e0b",padding:"12px 14px"}}>
          <div style={{fontFamily:"var(--font-display)",fontWeight:700,fontSize:13,marginBottom:6,color:"#f59e0b"}}>
            Some channels were skipped
          </div>
          <div style={{fontSize:12,color:"var(--text-muted)",display:"flex",flexDirection:"column",gap:4}}>
            {(skippedChannels || []).map((channel, index) => (
              <div key={`${channel.name}-${index}`}>
                {channel.name}: {channel.reason}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab==="Topics" && (
        <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:20}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
            <div style={{fontSize:12,color:"var(--text-muted)"}}>
              {rankedTopics.length} topic{rankedTopics.length !== 1 ? "s" : ""} ranked by weighted demand score
            </div>
            <button className="btn btn-secondary" disabled={exporting || !rankedTopics.length} onClick={()=>onExport("topics", rankedTopics)} style={{fontSize:11}}>
              Export Topics CSV
            </button>
          </div>
          {!rankedTopics.length ? (
            <div className="card" style={{textAlign:"center",color:"var(--text-muted)",padding:40}}>No demand topics found.</div>
          ) : (
            rankedTopics.slice(0, 20).map((topic, index) => (
              <TopicCard key={topic.topicKey} topic={topic} rank={index + 1} />
            ))
          )}
        </div>
      )}

      {activeTab==="Overview" && (
        <div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:16}}>
            <div className="card">
              <div style={{fontSize:10,color:"var(--text-muted)",letterSpacing:"0.1em",textTransform:"uppercase",fontFamily:"var(--font-display)",fontWeight:700,marginBottom:10}}>Overall Sentiment</div>
              <PieChart width={240} height={180} style={{margin:"0 auto"}}>
                <Pie data={sentPie} cx={120} cy={80} innerRadius={45} outerRadius={65} paddingAngle={3} dataKey="value">
                  {sentPie.map((e,i)=><Cell key={i} fill={e.color}/>)}
                </Pie>
                <Tooltip contentStyle={{background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:6,fontSize:11}}/>
                <Legend formatter={v=><span style={{color:"var(--text-muted)",fontSize:11}}>{v}</span>}/>
              </PieChart>
            </div>
            <div className="card">
              <div style={{fontSize:10,color:"var(--text-muted)",letterSpacing:"0.1em",textTransform:"uppercase",fontFamily:"var(--font-display)",fontWeight:700,marginBottom:10}}>Top by Virality</div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={(aggregate?.topVideosByVirality||[]).map(v=>({name:v.title?.slice(0,16)+"…",score:v.viralityScore?.score||0}))}>
                  <XAxis dataKey="name" tick={{fontSize:9,fill:"#6b7a99"}}/>
                  <YAxis tick={{fontSize:9,fill:"#6b7a99"}} domain={[0,100]}/>
                  <Tooltip contentStyle={{background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:6,fontSize:11}}/>
                  <Bar dataKey="score" radius={[4,4,0,0]}>
                    {(aggregate?.topVideosByVirality||[]).map((_,i)=><Cell key={i} fill={CHART_COLORS[i]}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top demand videos */}
          <div style={{fontSize:11,color:"var(--text-muted)",letterSpacing:"0.1em",textTransform:"uppercase",fontFamily:"var(--font-display)",fontWeight:700,marginBottom:10}}>🔥 Most Demanded Videos</div>
          <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:20}}>
            {(aggregate?.topVideosByDemand||[]).map((v,i)=>(
              <div key={i} className="card" style={{padding:"10px 14px",display:"flex",gap:12,alignItems:"center"}}>
                {v.thumbnail&&<img src={v.thumbnail} alt="" style={{width:64,height:36,objectFit:"cover",borderRadius:4,flexShrink:0}}/>}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontFamily:"var(--font-display)",fontSize:12,fontWeight:700,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>{v.title}</div>
                  <div style={{fontSize:11,color:"var(--text-muted)"}}>{v.channel} · 🎯 {v.stats?.demand} demand · 💬 {v.stats?.total} comments</div>
                </div>
                <div style={{fontSize:18,fontWeight:800,fontFamily:"var(--font-display)",color:"var(--accent)"}}>#{i+1}</div>
              </div>
            ))}
          </div>

          {/* Preview of top demand comments */}
          {(allDemandComments||[]).length>0 && (
            <div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                <span style={{fontFamily:"var(--font-display)",fontWeight:800,fontSize:15}}>🎯 Top Demand Comments</span>
                <button className="btn btn-secondary" onClick={()=>setActiveTab("Comments")} style={{fontSize:11}}>View All ({allDemandComments.length}) →</button>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {(allDemandComments||[]).slice(0,5).map((c,i)=><DemandCard key={c.commentId||i} c={c} showVideo={true}/>)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── DEMAND COMMENTS ───────────────────────────────────────────────── */}
      {activeTab==="Comments" && (
        <DemandPanel comments={allDemandComments||[]} showVideo={true} sentimentStats={sentStats} title="🎯 Top Comments With Weight" />
      )}

      {/* ── VIDEOS ────────────────────────────────────────────────────────── */}
      {activeTab==="Videos" && (
        <div>
          <div style={{fontSize:13,color:"var(--text-muted)",marginBottom:14}}>
            {(videos||[]).filter(v=>!v.error).length} videos analysed
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {(videos||[]).map((v,i)=>{
              if(v.error) return(
                <div key={i} className="card" style={{padding:"10px 14px",borderLeft:"3px solid var(--red)",opacity:0.6}}>
                  <div style={{fontSize:12,color:"var(--red)"}}>⚠ {v.error} — {v.title}</div>
                </div>
              );
              const posR=Math.round(((v.sentimentStats?.positive||0)/Math.max(1,v.sentimentStats?.total))*100);
              const isExp=selectedVideo===i;
              return(
                <div key={i} className="card" style={{padding:0,overflow:"hidden",cursor:"pointer"}} onClick={()=>setSelectedVideo(isExp?null:i)}>
                  <div style={{padding:"12px 14px",display:"flex",gap:12,alignItems:"flex-start"}}>
                    {(v.metadata?.thumbnail||v.thumbnail)&&<img src={v.metadata?.thumbnail||v.thumbnail} alt="" style={{width:80,height:45,objectFit:"cover",borderRadius:4,flexShrink:0}}/>}
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontFamily:"var(--font-display)",fontWeight:700,fontSize:13,marginBottom:4,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{v.metadata?.title||v.title}</div>
                      <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:6}}>{v.channelName}</div>
                      <div style={{display:"flex",gap:10,fontSize:11}}>
                        <span style={{color:"var(--accent)"}}>💬 {v.stats?.total}</span>
                        <span style={{color:"var(--green)"}}>🎯 {v.stats?.demand}</span>
                        <span style={{color:"#10b981"}}>😊 {posR}%</span>
                        <span style={{color:"#f59e0b"}}>🔥 {v.viralityScore?.score||0}</span>
                      </div>
                    </div>
                    <div style={{color:"var(--text-dim)",fontSize:12,transform:isExp?"rotate(180deg)":"none",transition:"transform 0.2s"}}>▼</div>
                  </div>
                  {isExp&&(
                    <div style={{borderTop:"1px solid var(--border)",padding:"12px 14px",background:"var(--bg3)"}} onClick={e=>e.stopPropagation()}>
                      {/* Topics */}
                      {(v.topics||[]).length>0&&(
                        <div style={{marginBottom:10}}>
                          <div style={{fontSize:10,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.1em",fontFamily:"var(--font-display)",fontWeight:700,marginBottom:6}}>Topics</div>
                          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                            {(v.topics||[]).slice(0,4).map(t=>(
                              <span key={t.topicKey} style={{background:`${t.color}22`,color:t.color,border:`1px solid ${t.color}44`,borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:700}}>{t.emoji} {t.label} ({t.commentCount})</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {/* Demand comments for this video */}
                      {(v.demandComments||[]).length>0&&(
                        <div>
                          <div style={{fontSize:10,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.1em",fontFamily:"var(--font-display)",fontWeight:700,marginBottom:8}}>🎯 Top Demand Comments</div>
                          <div style={{display:"flex",flexDirection:"column",gap:8}}>
                            {(v.demandComments||[]).slice(0,4).map((c,ci)=><DemandCard key={c.commentId||ci} c={c} showVideo={false}/>)}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── CHANNELS ─────────────────────────────────────────────────────── */}
      {activeTab==="Channels"&&(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:14}}>
          {(channels||[]).map((ch,i)=>{
            const chVids=(videos||[]).filter(v=>!v.error&&v.channelName===ch.name);
            const totalDemand=chVids.reduce((s,v)=>s+(v.stats?.demand||0),0);
            const totalComments=chVids.reduce((s,v)=>s+(v.stats?.total||0),0);
            const avgVirality=chVids.length?Math.round(chVids.reduce((s,v)=>s+(v.viralityScore?.score||0),0)/chVids.length):0;
            const color=CHART_COLORS[i];
            return(
              <div key={ch.id} className="card" style={{borderTop:`3px solid ${color}`}}>
                <div style={{display:"flex",gap:10,marginBottom:12}}>
                  {ch.thumbnail&&<img src={ch.thumbnail} alt="" style={{width:40,height:40,borderRadius:"50%",flexShrink:0}}/>}
                  <div>
                    <div style={{fontFamily:"var(--font-display)",fontWeight:700,fontSize:14,color}}>{ch.name}</div>
                    <div style={{fontSize:11,color:"var(--text-muted)"}}>{(ch.subscriberCount||0).toLocaleString()} subscribers</div>
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  {[["Videos",chVids.length,color],["Comments",totalComments,"#00d4ff"],["Demand",totalDemand,"#10b981"],["Avg Viral",avgVirality,"#f59e0b"]].map(([label,val,c])=>(
                    <div key={label} style={{background:"var(--bg3)",borderRadius:6,padding:"8px 10px",textAlign:"center"}}>
                      <div style={{fontSize:18,fontWeight:800,fontFamily:"var(--font-display)",color:c}}>{val}</div>
                      <div style={{fontSize:10,color:"var(--text-muted)"}}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Single Video Dashboard ────────────────────────────────────────────────────
function CompareDashboard({ data, onExport, exporting }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("Overview");
  const videos = (data.videos || []).filter(v => !v.error);
  const allDemandComments = data.allDemandComments || [];
  const TABS = ["Overview", "Comments", "Videos", "Raw"];
  const rankedTopics = videos
    .flatMap(v => (v.topics || []).map(topic => ({
      ...topic,
      topicKey: `${v.metadata?.videoId || v.url}-${topic.topicKey}`,
      sampleComments: topic.sampleComments || [],
    })))
    .sort((a, b) => (b.weightedScore || 0) - (a.weightedScore || 0));

  const aggregate = videos.reduce((acc, video) => {
    acc.totalVideos += 1;
    acc.totalComments += video.stats?.total || 0;
    acc.totalDemand += video.stats?.demand || 0;
    acc.positive += video.sentimentStats?.positive || 0;
    acc.negative += video.sentimentStats?.negative || 0;
    acc.neutral += video.sentimentStats?.neutral || 0;
    acc.sentimentTotal += video.sentimentStats?.total || 0;
    return acc;
  }, { totalVideos: 0, totalComments: 0, totalDemand: 0, positive: 0, negative: 0, neutral: 0, sentimentTotal: 0 });

  const positiveRate = Math.round((aggregate.positive / Math.max(1, aggregate.sentimentTotal)) * 100);
  const negativeRate = Math.round((aggregate.negative / Math.max(1, aggregate.sentimentTotal)) * 100);
  const topByDemand = [...videos].sort((a, b) => (b.stats?.demand || 0) - (a.stats?.demand || 0));
  const topByVirality = [...videos].sort((a, b) => (b.viralityScore?.score || 0) - (a.viralityScore?.score || 0));

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
        <div>
          <h2 style={{fontFamily:"var(--font-display)",fontSize:20,marginBottom:4}}>Compare Videos</h2>
          <div style={{fontSize:12,color:"var(--text-muted)"}}>
            {aggregate.totalVideos} videos · {aggregate.totalComments.toLocaleString()} comments · <span style={{color:"var(--green)",fontWeight:700}}>{aggregate.totalDemand} demand signals</span>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button className="btn btn-primary" disabled={exporting} onClick={()=>onExport("compare-demand", allDemandComments)} style={{fontSize:11}}>CSV</button>
          <button className="btn btn-secondary" onClick={()=>router.push("/")} style={{fontSize:11}}>Home</button>
        </div>
      </div>

      <div style={{display:"flex",gap:2,marginBottom:20,borderBottom:"1px solid var(--border)",overflowX:"auto"}}>
        {TABS.map(t=>(
          <button key={t} onClick={()=>setActiveTab(t)} style={{padding:"10px 14px",border:"none",background:"transparent",color:activeTab===t?"var(--accent)":"var(--text-muted)",fontFamily:"var(--font-display)",fontWeight:700,fontSize:12,cursor:"pointer",borderBottom:activeTab===t?"2px solid var(--accent)":"2px solid transparent",marginBottom:-1,whiteSpace:"nowrap"}}>
            {t}{t==="Comments" && allDemandComments.length ? ` (${allDemandComments.length})` : ""}
          </button>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:12,marginBottom:20}}>
        <StatCard label="Videos" value={aggregate.totalVideos} icon="🎬" color="var(--accent)"/>
        <StatCard label="Comments" value={aggregate.totalComments.toLocaleString()} icon="💬" color="var(--text)"/>
        <StatCard label="Demand" value={aggregate.totalDemand} icon="🎯" color="var(--green)"/>
        <StatCard label="Positive" value={`${positiveRate}%`} icon="😊" color="#10b981"/>
        <StatCard label="Negative" value={`${negativeRate}%`} icon="😤" color="#ef4444"/>
        <StatCard label="Topics" value={videos.reduce((sum, v) => sum + (v.topics?.length || 0), 0)} icon="📋" color="var(--accent3)"/>
      </div>

      {activeTab==="Overview" && (
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <div className="card">
            <div style={{fontSize:10,color:"var(--text-muted)",letterSpacing:"0.1em",textTransform:"uppercase",fontFamily:"var(--font-display)",fontWeight:700,marginBottom:10}}>Top by Demand</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {topByDemand.slice(0,5).map((v,i)=>(
                <div key={v.metadata?.videoId||i} style={{display:"flex",gap:10,alignItems:"center",background:"var(--bg3)",borderRadius:8,padding:"8px 10px"}}>
                  {v.metadata?.thumbnail && <img src={v.metadata.thumbnail} alt="" style={{width:64,height:36,objectFit:"cover",borderRadius:4,flexShrink:0}}/>}
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:700,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>{v.metadata?.title}</div>
                    <div style={{fontSize:10,color:"var(--text-muted)"}}>{v.metadata?.channel} · 🎯 {v.stats?.demand || 0}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <div style={{fontSize:10,color:"var(--text-muted)",letterSpacing:"0.1em",textTransform:"uppercase",fontFamily:"var(--font-display)",fontWeight:700,marginBottom:10}}>Top by Virality</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {topByVirality.slice(0,5).map((v,i)=>(
                <div key={v.metadata?.videoId||i} style={{display:"flex",gap:10,alignItems:"center",background:"var(--bg3)",borderRadius:8,padding:"8px 10px"}}>
                  {v.metadata?.thumbnail && <img src={v.metadata.thumbnail} alt="" style={{width:64,height:36,objectFit:"cover",borderRadius:4,flexShrink:0}}/>}
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:700,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>{v.metadata?.title}</div>
                    <div style={{fontSize:10,color:"var(--text-muted)"}}>{v.metadata?.channel} · 🔥 {v.viralityScore?.score || 0}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab==="Comments" && (
        <DemandPanel comments={allDemandComments} showVideo={true} sentimentStats={aggregate} title={`Top Comments With Weight — ${allDemandComments.length} found`}/>
      )}

      {activeTab==="Videos" && (
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {videos.map((video,i)=>(
            <div key={video.metadata?.videoId||i} className="card" style={{padding:"12px 14px"}}>
              <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
                {video.metadata?.thumbnail && <img src={video.metadata.thumbnail} alt="" style={{width:120,height:68,objectFit:"cover",borderRadius:6,flexShrink:0}}/>}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:10,color:"var(--text-muted)",marginBottom:3}}>{video.metadata?.channel}</div>
                  <div style={{fontFamily:"var(--font-display)",fontWeight:700,fontSize:14,lineHeight:1.35,marginBottom:6}}>{video.metadata?.title}</div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(90px,1fr))",gap:8}}>
                    <div style={{background:"var(--bg3)",borderRadius:6,padding:"6px 8px",textAlign:"center"}}><div style={{fontWeight:800,color:"var(--text)"}}>{video.stats?.total || 0}</div><div style={{fontSize:10,color:"var(--text-muted)"}}>Comments</div></div>
                    <div style={{background:"var(--bg3)",borderRadius:6,padding:"6px 8px",textAlign:"center"}}><div style={{fontWeight:800,color:"var(--green)"}}>{video.stats?.demand || 0}</div><div style={{fontSize:10,color:"var(--text-muted)"}}>Demand</div></div>
                    <div style={{background:"var(--bg3)",borderRadius:6,padding:"6px 8px",textAlign:"center"}}><div style={{fontWeight:800,color:"#10b981"}}>{Math.round(((video.sentimentStats?.positive||0)/Math.max(1,video.sentimentStats?.total||0))*100)}%</div><div style={{fontSize:10,color:"var(--text-muted)"}}>Positive</div></div>
                    <div style={{background:"var(--bg3)",borderRadius:6,padding:"6px 8px",textAlign:"center"}}><div style={{fontWeight:800,color:"#f59e0b"}}>{video.viralityScore?.score || 0}</div><div style={{fontSize:10,color:"var(--text-muted)"}}>Virality</div></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab==="Raw" && (
        <div className="card" style={{padding:0,overflow:"hidden"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 14px",borderBottom:"1px solid var(--border)"}}>
            <span style={{fontSize:12,color:"var(--text-muted)"}}>Raw JSON</span>
            <button className="btn btn-secondary" style={{fontSize:11}} onClick={()=>{const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="yt-compare.json";a.click();URL.revokeObjectURL(url);}}>JSON</button>
          </div>
          <pre style={{padding:14,fontSize:11,color:"var(--green)",overflowX:"auto",maxHeight:500,background:"var(--bg)",lineHeight:1.6}}>
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

function SingleVideoDetails({ data, onExport, exporting }) {
  const router = useRouter();
  const [tab, setTab] = useState("Topics");
  const [sentFilter, setSentFilter] = useState("all");
  const TABS = ["Topics","Keywords","Comments","Raw"];

  const { metadata, stats, topics, topKeywords, demandComments, allComments, sentimentStats, intentSummary, suggestions, viralityScore, actionableSteps } = data;

  const sentPieData=[
    {name:"Positive",value:sentimentStats?.positive||0,color:"#10b981"},
    {name:"Negative",value:sentimentStats?.negative||0,color:"#ef4444"},
    {name:"Neutral", value:sentimentStats?.neutral||0, color:"#6b7a99"},
  ].filter(d=>d.value>0);

  const pieData=[
    {name:"Demand",   value:stats?.demand||0,                            color:"#10b981"},
    {name:"Tech",     value:(stats?.tech||0)-(stats?.demand||0),         color:"#00d4ff"},
    {name:"Non-tech", value:stats?.nonTech||0,                           color:"#3d4f6b"},
  ].filter(d=>d.value>0);

  return(
    <div>
      {/* Tabs */}
      <div style={{display:"flex",gap:2,marginBottom:20,borderBottom:"1px solid var(--border)",overflowX:"auto"}}>
        {TABS.map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{padding:"10px 14px",border:"none",background:"transparent",color:tab===t?"var(--accent)":"var(--text-muted)",fontFamily:"var(--font-display)",fontWeight:700,fontSize:12,cursor:"pointer",borderBottom:tab===t?"2px solid var(--accent)":"2px solid transparent",marginBottom:-1,whiteSpace:"nowrap"}}>
            {t}
          </button>
        ))}
        <button className="btn btn-secondary" onClick={()=>router.push("/")} style={{fontSize:11,padding:"6px 12px",marginLeft:"auto",marginBottom:4}}>← Home</button>
      </div>

      {/* Metadata banner */}
      <div className="card fade-in" style={{marginBottom:20,display:"flex",gap:12,alignItems:"flex-start"}}>
        {metadata?.thumbnail&&<img src={metadata.thumbnail} alt="" style={{width:100,height:56,objectFit:"cover",borderRadius:6,flexShrink:0}}/>}
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:10,color:"var(--text-muted)",marginBottom:2}}>{metadata?.channel}</div>
          <div style={{fontFamily:"var(--font-display)",fontWeight:700,fontSize:13,color:"var(--text)",lineHeight:1.3,marginBottom:6,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{metadata?.title}</div>
          <div style={{display:"flex",gap:12,fontSize:11,color:"var(--text-muted)"}}>
            <span>👁 {(metadata?.viewCount||0).toLocaleString()}</span>
            <span>👍 {(metadata?.likeCount||0).toLocaleString()}</span>
            <span>💬 {(metadata?.commentCount||0).toLocaleString()}</span>
          </div>
        </div>
        <button className="btn btn-primary" disabled={exporting} onClick={()=>onExport("demand",demandComments)} style={{fontSize:11,flexShrink:0}}>⬇ CSV</button>
      </div>

      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:12,marginBottom:20}}>
        <StatCard label="Total" value={(stats?.total||0).toLocaleString()} icon="💬" color="var(--text)"/>
        <StatCard label="Demand" value={stats?.demand||0} sub={`${stats?.demandPercent||0}%`} icon="🎯" color="var(--green)"/>
        <StatCard label="😊 Positive" value={`${Math.round(((sentimentStats?.positive||0)/Math.max(1,sentimentStats?.total))*100)}%`} icon="😊" color="#10b981"/>
        <StatCard label="😤 Negative" value={`${Math.round(((sentimentStats?.negative||0)/Math.max(1,sentimentStats?.total))*100)}%`} icon="😤" color="#ef4444"/>
        <StatCard label="🔥 Virality" value={viralityScore?.score||0} sub={viralityScore?.label} icon="🔥" color="#f59e0b"/>
        <StatCard label="Topics" value={(topics||[]).length} icon="📋" color="var(--accent3)"/>
      </div>

      {/* ── OVERVIEW ───────────────────────────────────────────────────── */}
      {tab==="Overview"&&(
        <div>
          <div style={{marginBottom:14}}><ViralityMeter score={viralityScore?.score||0} label={viralityScore?.label||""} reasoning={viralityScore?.reasoning||""}/></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
            <div className="card">
              <div style={{fontSize:10,color:"var(--text-muted)",letterSpacing:"0.1em",textTransform:"uppercase",fontFamily:"var(--font-display)",fontWeight:700,marginBottom:8}}>Distribution</div>
              <PieChart width={200} height={160} style={{margin:"0 auto"}}>
                <Pie data={pieData} cx={100} cy={70} innerRadius={38} outerRadius={58} paddingAngle={3} dataKey="value">{pieData.map((e,i)=><Cell key={i} fill={e.color}/>)}</Pie>
                <Tooltip contentStyle={{background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:6,fontSize:11}}/>
                <Legend formatter={v=><span style={{color:"var(--text-muted)",fontSize:10}}>{v}</span>}/>
              </PieChart>
            </div>
            <div className="card">
              <div style={{fontSize:10,color:"var(--text-muted)",letterSpacing:"0.1em",textTransform:"uppercase",fontFamily:"var(--font-display)",fontWeight:700,marginBottom:8}}>Sentiment</div>
              <PieChart width={200} height={160} style={{margin:"0 auto"}}>
                <Pie data={sentPieData} cx={100} cy={70} innerRadius={38} outerRadius={58} paddingAngle={3} dataKey="value">{sentPieData.map((e,i)=><Cell key={i} fill={e.color}/>)}</Pie>
                <Tooltip contentStyle={{background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:6,fontSize:11}}/>
                <Legend formatter={v=><span style={{color:"var(--text-muted)",fontSize:10}}>{v}</span>}/>
              </PieChart>
            </div>
          </div>
          {/* Preview demand comments */}
          {(demandComments||[]).length>0&&(
            <div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                <span style={{fontFamily:"var(--font-display)",fontWeight:800,fontSize:15}}>🎯 Top Demand Comments</span>
                <button className="btn btn-secondary" onClick={()=>setTab("Comments")} style={{fontSize:11}}>View All ({(demandComments||[]).length}) →</button>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
                {(demandComments||[]).slice(0,4).map((c,i)=><DemandCard key={c.commentId||i} c={c} showVideo={false}/>)}
              </div>
            </div>
          )}
          {(actionableSteps||[]).length>0&&(
            <div>
              <div style={{fontSize:11,color:"var(--text-muted)",letterSpacing:"0.1em",textTransform:"uppercase",fontFamily:"var(--font-display)",fontWeight:700,marginBottom:10}}>📋 Actionable Steps</div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {(actionableSteps||[]).map((s,i)=><ActionStep key={i} step={s}/>)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── DEMAND COMMENTS ────────────────────────────────────────────── */}
      {tab==="Comments"&&(
        <DemandPanel comments={demandComments||[]} showVideo={false} sentimentStats={sentimentStats} title={`🎯 Top Comments With Weight — ${(demandComments||[]).length} found`}/>
      )}

      {/* ── TOPICS ─────────────────────────────────────────────────────── */}
      {tab==="Topics"&&(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
            <div style={{fontSize:12,color:"var(--text-muted)"}}>
              {(topics||[]).length} topic{(topics||[]).length !== 1 ? "s" : ""} ranked by weighted demand score
            </div>
            <button className="btn btn-secondary" disabled={exporting || !(topics||[]).length} onClick={()=>onExport("topics",topics||[])} style={{fontSize:11}}>
              Export Topics CSV
            </button>
          </div>
          {!(topics||[]).length
            ?<div className="card" style={{textAlign:"center",color:"var(--text-muted)",padding:40}}>No demand topics found.</div>
            :(topics||[]).map((t,i)=><TopicCard key={t.topicKey} topic={t} rank={i+1}/>)}
        </div>
      )}

      {/* ── SENTIMENT ──────────────────────────────────────────────────── */}
      {tab==="Sentiment"&&(
        <div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
            <div className="card">
              <PieChart width={260} height={200} style={{margin:"0 auto"}}>
                <Pie data={sentPieData} cx={130} cy={90} innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">{sentPieData.map((e,i)=><Cell key={i} fill={e.color}/>)}</Pie>
                <Tooltip contentStyle={{background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:6,fontSize:12}}/>
                <Legend formatter={v=><span style={{color:"var(--text-muted)",fontSize:12}}>{v}</span>}/>
              </PieChart>
            </div>
            <div className="card">
              {[["😊 Positive",sentimentStats?.positive||0,"#10b981"],["😤 Negative",sentimentStats?.negative||0,"#ef4444"],["😐 Neutral",sentimentStats?.neutral||0,"#6b7a99"]].map(([label,val,color])=>(
                <div key={label} style={{marginBottom:14}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                    <span style={{fontSize:13}}>{label}</span>
                    <span style={{fontSize:13,fontWeight:700,color}}>{val} ({Math.round((val/Math.max(1,sentimentStats?.total))*100)}%)</span>
                  </div>
                  <div className="progress-bar"><div className="progress-fill" style={{width:`${Math.round((val/Math.max(1,sentimentStats?.total))*100)}%`,background:color}}/></div>
                </div>
              ))}
            </div>
          </div>
          <div style={{display:"flex",gap:6,marginBottom:10}}>
            {["all","positive","negative","neutral"].map(f=>(
              <button key={f} onClick={()=>setSentFilter(f)} className="btn" style={{fontSize:11,background:sentFilter===f?"var(--accent)":"var(--bg3)",color:sentFilter===f?"var(--bg)":"var(--text-muted)",border:"1px solid var(--border)"}}>{f}</button>
            ))}
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Sentiment</th><th>Author</th><th>Comment</th><th>Score</th><th>Likes</th></tr></thead>
              <tbody>
                {(allComments||[]).filter(c=>sentFilter==="all"||c.sentiment===sentFilter).slice(0,80).map(c=>(
                  <tr key={c.commentId}>
                    <td><SentBadge s={c.sentiment}/></td>
                    <td style={{fontSize:11,color:"var(--text-muted)",whiteSpace:"nowrap"}}>@{c.author}</td>
                    <td style={{maxWidth:360,fontSize:12}}>{c.text?.slice(0,150)}{c.text?.length>150?"…":""}</td>
                    <td style={{fontWeight:700,color:c.sentimentScore>0?"#10b981":c.sentimentScore<0?"#ef4444":"#6b7a99"}}>{c.sentimentScore}</td>
                    <td style={{color:"var(--accent4)"}}>👍{c.likeCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── INTENTS ────────────────────────────────────────────────────── */}
      {tab==="Intents"&&(
        <div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:10,marginBottom:16}}>
            {(intentSummary||[]).map(intent=>(
              <div key={intent.intent} className="card" style={{borderLeft:`3px solid ${intent.color}`,padding:"12px 14px"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                  <span style={{fontSize:18}}>{intent.emoji}</span>
                  <span style={{fontFamily:"var(--font-display)",fontWeight:700,fontSize:13,color:intent.color}}>{intent.label}</span>
                  <span style={{marginLeft:"auto",background:`${intent.color}22`,color:intent.color,border:`1px solid ${intent.color}44`,borderRadius:20,padding:"2px 10px",fontSize:12,fontWeight:700}}>{intent.count}</span>
                </div>
                <div className="progress-bar"><div className="progress-fill" style={{width:`${Math.min(100,intent.count*10)}%`,background:intent.color}}/></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SUGGESTIONS ────────────────────────────────────────────────── */}
      {tab==="Suggestions"&&(
        <div>
          {!(suggestions||[]).length
            ?<div className="card" style={{textAlign:"center",color:"var(--text-muted)",padding:40}}>No explicit content suggestions found.</div>
            :<div style={{display:"flex",flexDirection:"column",gap:10}}>
              {(suggestions||[]).map((s,i)=>(
                <div key={i} className="card" style={{padding:"12px 14px",borderLeft:"3px solid var(--accent)"}}>
                  <div style={{display:"flex",gap:10}}>
                    <div style={{minWidth:26,height:26,background:"var(--accent)",borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"var(--font-display)",fontWeight:800,fontSize:12,color:"var(--bg)",flexShrink:0}}>#{i+1}</div>
                    <div>
                      <div style={{fontFamily:"var(--font-display)",fontWeight:700,fontSize:13,marginBottom:4}}>💡 {s.suggestion}</div>
                      <div style={{fontSize:11,color:"var(--text-muted)"}}>Trigger: "{s.trigger}" · {s.count||1} request(s) · {s.authorCount||1} viewer(s) · 👍{s.likes}</div>
                      {(s.matchedComments||[])[0] && (
                        <div style={{marginTop:8,background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:6,padding:"8px 10px",fontSize:11,color:"var(--text)"}}>
                          <div style={{fontSize:10,color:"var(--text-muted)",marginBottom:4}}>@{s.matchedComments[0].author} · 👍{s.matchedComments[0].likeCount||0}</div>
                          "{s.matchedComments[0].text}{s.matchedComments[0].text?.length>=140?"…":""}"
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>}
        </div>
      )}

      {/* ── RAW ────────────────────────────────────────────────────────── */}
      {tab==="Keywords"&&(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
            <div style={{fontSize:12,color:"var(--text-muted)"}}>
              {(topKeywords||[]).length} keyword{(topKeywords||[]).length !== 1 ? "s" : ""} extracted from demand comments
            </div>
            <button className="btn btn-secondary" disabled={exporting || !(topKeywords||[]).length} onClick={()=>onExport("keywords",topKeywords||[])} style={{fontSize:11}}>
              Export Keywords CSV
            </button>
          </div>
          {!(topKeywords||[]).length ? (
            <div className="card" style={{textAlign:"center",color:"var(--text-muted)",padding:40}}>No keywords found.</div>
          ) : (
            <div className="card" style={{display:"flex",flexWrap:"wrap",gap:10}}>
              {(topKeywords||[]).map((kw, index) => (
                <span key={`${kw.word}-${index}`} className="tag tag-accent" style={{fontSize:13,padding:"8px 12px"}}>
                  {kw.word} <span style={{opacity:0.7}}>x{Number(kw.score || 0).toFixed(2)}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {tab==="Raw"&&(
        <div className="card" style={{padding:0,overflow:"hidden"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 14px",borderBottom:"1px solid var(--border)"}}>
            <span style={{fontSize:12,color:"var(--text-muted)"}}>Raw JSON</span>
            <button className="btn btn-secondary" style={{fontSize:11}} onClick={()=>{const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="yt-analysis.json";a.click();URL.revokeObjectURL(url);}}>⬇ JSON</button>
          </div>
          <pre style={{padding:14,fontSize:11,color:"var(--green)",overflowX:"auto",maxHeight:500,background:"var(--bg)",lineHeight:1.6}}>
            {JSON.stringify({metadata,stats,sentimentStats,viralityScore,topics:topics?.slice(0,2),topKeywords:topKeywords?.slice(0,5)},null,2)}
          </pre>
        </div>
      )}
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const router = useRouter();
  const [data, setData]         = useState(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("yt_analysis");
    if (stored) { try { setData(JSON.parse(stored)); } catch { router.push("/"); } }
    else router.push("/");
  }, []);

  useEffect(() => {
    if (!data || data.mode === "channels" || data.mode === "compare") return;
    try {
      const history = JSON.parse(localStorage.getItem("yt_history") || "[]");
      if (history[0]?.data?.metadata?.videoId === data.metadata?.videoId) return;
      const entry = {
        id: Date.now(), type: data.mode || "single",
        label: data.metadata?.title || "Video Analysis",
        channels: [data.metadata?.channel || "Unknown"],
        totalVideos: 1, totalComments: data.stats?.total || 0,
        createdAt: new Date().toISOString(), data,
      };
      history.unshift(entry);
      localStorage.setItem("yt_history", JSON.stringify(history.slice(0, 20)));
    } catch {}
  }, [data]);

  if (!data) return (
    <>
      <Navbar />
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"calc(100vh - 56px)"}}>
        <div style={{textAlign:"center"}}>
          <div className="spin" style={{fontSize:32,display:"inline-block"}}>⟳</div>
          <div style={{color:"var(--text-muted)",marginTop:12}}>Loading analysis…</div>
        </div>
      </div>
    </>
  );

  async function handleExport(type, payload) {
    setExporting(true);
    try {
      const res = await fetch("/api/export",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({data:payload,type})});
      if(!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href=url; a.download=`yt-analyser-${type}-${Date.now()}.csv`; a.click();
      URL.revokeObjectURL(url);
    } catch(err){alert(err.message);}
    finally{setExporting(false);}
  }

  return (
    <>
      <Head><title>Dashboard – YTAnalyser</title></Head>
      <Navbar />
      <main style={{padding:"24px 0 60px"}}>
        <div className="container">
          {data.mode==="channels"
            ?<ChannelsDashboard data={data} onExport={handleExport} exporting={exporting}/>
            :data.mode==="compare"
              ?<CompareDashboard data={data} onExport={handleExport} exporting={exporting}/>
              :<SingleVideoDetails data={data} onExport={handleExport} exporting={exporting}/>}
        </div>
      </main>
    </>
  );
}
