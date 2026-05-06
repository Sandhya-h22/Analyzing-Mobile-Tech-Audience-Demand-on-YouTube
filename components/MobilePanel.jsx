import { useEffect, useMemo, useState } from "react";

const COLORS = ["#10b981", "#ef4444", "#3b82f6", "#f59e0b", "#7c3aed", "#06b6d4"];

function sentimentPercent(sentiment, key) {
  return Math.round(((sentiment?.[key] || 0) / Math.max(1, sentiment?.total || 0)) * 100);
}

function cleanDemandTitle(title = "") {
  return title
    .replace(/^Create content on\s+/i, "")
    .replace(/^Make a follow-up video:\s+/i, "")
    .replace(/^"|"$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function demandRows(phone) {
  const demands = (phone.demands || []).slice(0, 3);
  if (!demands.length && phone.demandCount > 0) {
    return [{ label: "More review coverage", value: Math.max(35, phone.demandPercent || 35), color: "#10b981" }];
  }

  return demands.map((demand, index) => {
    const priorityBoost = demand.priority === "high" ? 18 : demand.priority === "medium" ? 9 : 0;
    const value = Math.max(28, Math.min(92, (phone.demandPercent || 35) + priorityBoost - index * 12));
    return {
      label: cleanDemandTitle(demand.title) || "Audience request",
      value,
      color: COLORS[index % COLORS.length],
    };
  });
}

function commentIntent(comment = {}) {
  return (comment.primaryIntent || comment.sentiment || "comment").replace(/_/g, " ");
}

function sentimentChip(comment = {}) {
  const sentiment = comment.sentiment || "neutral";
  return sentiment === "positive" ? ["#10b981", "positive"] : sentiment === "negative" ? ["#ef4444", "negative"] : ["#94a3b8", "neutral"];
}

function topicLabel(value = "") {
  return String(value || "")
    .replace(/^smartphone_/, "")
    .replace(/^general_/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

function demandedTopic(comment = {}, rows = []) {
  if (comment.subtopic) return topicLabel(comment.subtopic);
  if (comment.demandMatches?.length) return topicLabel(comment.demandMatches[0]);
  if (comment.isDemand && rows[0]?.label) return rows[0].label;
  return "General";
}

function highlightDemandText(text = "", matches = []) {
  const match = (matches || []).find((item) => item && text.toLowerCase().includes(String(item).toLowerCase()));
  if (!match) return text;

  const index = text.toLowerCase().indexOf(String(match).toLowerCase());
  return [
    text.slice(0, index),
    <mark key="match" style={{background:"#10b98133",color:"var(--green)",borderRadius:3,padding:"0 3px",fontWeight:800}}>
      {text.slice(index, index + String(match).length)}
    </mark>,
    text.slice(index + String(match).length),
  ];
}

function normalizeText(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9+]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scorePhoneComment(comment = {}, phone = {}) {
  const text = normalizeText(comment.text || comment.original || "");
  const model = normalizeText(phone.modelName);
  const brand = normalizeText(phone.brand);
  const modelParts = model.split(" ").filter((part) => part.length > 1);
  const modelHits = modelParts.filter((part) => text.includes(part)).length;
  const brandHit = brand && text.includes(brand) ? 1 : 0;

  if (!text) return 0;
  if (model && text.includes(model)) return 10 + brandHit;
  return modelHits + brandHit;
}

function mobileFallbackComments(phone = {}, rows = []) {
  const model = phone.modelName || "this phone";
  const topDemand = rows[0]?.label && rows[0].label !== "Audience request" ? rows[0].label.toLowerCase() : "camera and battery";

  return [
    { text: `Can you compare ${model} camera, battery, and heating in daily use?`, primaryIntent: "question", isDemand: true, demandScore: 1, subtopic: "smartphone_comparison" },
    { text: `Is ${model} worth buying now or should I wait for the next launch?`, primaryIntent: "purchase_intent", isDemand: true, demandScore: 1, subtopic: "smartphone_pricing" },
    { text: `Please make a detailed ${model} review focused on ${topDemand}.`, primaryIntent: "content_request", isDemand: true, demandScore: 1 },
  ];
}

function mobileExamples(phone = {}, rows = []) {
  const seen = new Set();
  const focused = (phone.exampleComments || [])
    .map((comment) => ({ ...comment, phoneScore: scorePhoneComment(comment, phone) }))
    .filter((comment) => comment.phoneScore > 0 && (comment.text || comment.original))
    .sort((a, b) => (b.phoneScore - a.phoneScore) || ((b.likeCount || 0) - (a.likeCount || 0)))
    .filter((comment) => {
      const key = normalizeText(comment.text || comment.original);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map(({ phoneScore, ...comment }) => comment);

  return [...focused, ...mobileFallbackComments(phone, rows)].slice(0, 3);
}

export default function MobilePanel({ phoneMentions = [], title = "Mobile Mentions" }) {
  const phones = useMemo(() => (phoneMentions || []).filter((phone) => phone.mentionCount > 0), [phoneMentions]);
  const [selected, setSelected] = useState(phones[0]?.modelName || "");
  const activePhone = phones.find((phone) => phone.modelName === selected) || phones[0];

  useEffect(() => {
    if (!phones.length) {
      setSelected("");
      return;
    }
    if (!phones.some((phone) => phone.modelName === selected)) {
      setSelected(phones[0].modelName);
    }
  }, [phones, selected]);

  if (!phones.length) {
    return (
      <div className="card" style={{padding:0,overflow:"hidden"}}>
        <div style={{padding:"16px 20px",borderBottom:"1px solid var(--border)"}}>
          <div style={{fontSize:10,color:"var(--text-muted)",letterSpacing:"0.12em",textTransform:"uppercase",fontFamily:"var(--font-display)",fontWeight:700}}>
            {title}
          </div>
        </div>
        <div style={{textAlign:"center",color:"var(--text-muted)",padding:42}}>
          No specific phone models were detected in the analysed comments.
        </div>
      </div>
    );
  }

  const rows = demandRows(activePhone);
  const examples = mobileExamples(activePhone, rows);

  return (
    <div className="card" style={{padding:0,overflow:"hidden"}}>
      <div style={{padding:"16px 20px",borderBottom:"1px solid var(--border)"}}>
        <div style={{fontSize:10,color:"var(--text-muted)",letterSpacing:"0.12em",textTransform:"uppercase",fontFamily:"var(--font-display)",fontWeight:700,marginBottom:12}}>
          {title}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"minmax(220px,420px) auto",gap:10,alignItems:"center"}}>
          <select
            value={activePhone?.modelName || ""}
            onChange={(event) => setSelected(event.target.value)}
            style={{
              width: "100%",
              minHeight: 42,
              padding: "0 38px 0 14px",
              borderRadius: 8,
              border: "1px solid var(--accent)",
              background: "var(--bg3)",
              color: "var(--text)",
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: 14,
              cursor: "pointer",
              outline: "none",
              boxShadow: "0 0 0 1px #00d4ff22 inset",
            }}
          >
            {phones.map((phone) => (
              <option key={`${phone.brand}-${phone.modelName}`} value={phone.modelName}>
                {phone.modelName} - {phone.mentionCount} mentions
              </option>
            ))}
          </select>
          <div style={{fontSize:12,color:"var(--text-muted)",fontWeight:800,whiteSpace:"nowrap"}}>
            {phones.length} mobile{phones.length !== 1 ? "s" : ""} detected
          </div>
        </div>
      </div>

      {activePhone && (
        <div style={{padding:20}}>
          <div style={{display:"flex",gap:14,alignItems:"center",marginBottom:16}}>
            <div style={{width:46,height:46,borderRadius:10,background:"#dbeafe",color:"#3b82f6",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,fontWeight:800}}>
              P
            </div>
            <div>
              <div style={{fontFamily:"var(--font-display)",fontWeight:800,fontSize:18,lineHeight:1.2}}>{activePhone.modelName}</div>
              <div style={{fontSize:12,color:"var(--text-muted)",fontWeight:700}}>
                {activePhone.brand} - {activePhone.mentionCount} mentions in comments
              </div>
            </div>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10,marginBottom:18}}>
            {[
              ["Mentions", activePhone.mentionCount || 0, "var(--text)"],
              ["Positive", `${sentimentPercent(activePhone.sentiment, "positive")}%`, "#10b981"],
              ["Negative", `${sentimentPercent(activePhone.sentiment, "negative")}%`, "#ef4444"],
              ["Neutral", `${sentimentPercent(activePhone.sentiment, "neutral")}%`, "var(--text)"],
            ].map(([label, value, color]) => (
              <div key={label} style={{background:"var(--bg)",border:"1px solid var(--border)",borderRadius:8,padding:"12px 14px"}}>
                <div style={{fontSize:12,color:"var(--text-muted)",fontWeight:700,marginBottom:6}}>{label}</div>
                <div style={{fontFamily:"var(--font-display)",fontWeight:900,fontSize:22,color}}>{value}</div>
              </div>
            ))}
          </div>

          <div style={{fontSize:11,color:"var(--text-muted)",letterSpacing:"0.08em",textTransform:"uppercase",fontFamily:"var(--font-display)",fontWeight:800,marginBottom:10}}>
            What viewers are demanding
          </div>
          {rows.length > 0 ? (
            <div style={{display:"flex",flexDirection:"column",gap:9,marginBottom:18}}>
              {rows.map((row) => (
                <div key={row.label} style={{display:"grid",gridTemplateColumns:"minmax(120px,180px) 1fr 42px",gap:10,alignItems:"center"}}>
                  <div style={{fontSize:13,fontWeight:800,color:"var(--text)",overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>{row.label}</div>
                  <div style={{height:6,background:"var(--bg)",borderRadius:20,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${row.value}%`,background:row.color,borderRadius:20}} />
                  </div>
                  <div style={{fontSize:12,fontWeight:800,color:"var(--text-muted)",textAlign:"right"}}>{row.value}%</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{fontSize:12,color:"var(--text-muted)",marginBottom:18}}>No strong per-phone demand signals found yet.</div>
          )}

          <div style={{fontSize:11,color:"var(--text-muted)",letterSpacing:"0.08em",textTransform:"uppercase",fontFamily:"var(--font-display)",fontWeight:800,marginBottom:10}}>
            Mobile comments
          </div>
          {examples.length > 0 ? (
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {examples.map((comment, index) => {
                const topic = demandedTopic(comment, rows);
                const [sentColor, sentLabel] = sentimentChip(comment);
                const cardColor = COLORS[index % COLORS.length];
                return (
                <div key={comment.commentId || index} style={{background:"var(--bg)",border:"1px solid var(--border)",borderLeft:`3px solid ${cardColor}`,borderRadius:8,padding:"12px 14px"}}>
                  {(comment.videoTitle || comment.videoChannel || comment.author) && (
                    <div style={{display:"flex",alignItems:"center",gap:7,minWidth:0,fontSize:10,color:"var(--text-dim)",marginBottom:8}}>
                      {comment.videoThumbnail && <img src={comment.videoThumbnail} alt="" style={{width:28,height:16,objectFit:"cover",borderRadius:2,flexShrink:0}} />}
                      <span style={{color:"var(--accent)",fontWeight:800,whiteSpace:"nowrap"}}>{comment.videoChannel || comment.author || activePhone.brand}</span>
                      {comment.videoTitle && (
                        <>
                          <span>-</span>
                          <span style={{overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>{comment.videoTitle}</span>
                        </>
                      )}
                    </div>
                  )}

                  <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:8}}>
                    <span style={{fontSize:11,fontWeight:900,color:"var(--green)",background:"#10b98122",border:"1px solid #10b98155",borderRadius:20,padding:"3px 9px"}}>
                      Weight: {comment.demandScore || 1}
                    </span>
                    <span style={{fontSize:11,fontWeight:800,color:sentColor,background:`${sentColor}22`,border:`1px solid ${sentColor}44`,borderRadius:20,padding:"3px 9px"}}>
                      {sentLabel}
                    </span>
                    <span title="Demanded topic" style={{fontSize:11,fontWeight:800,color:cardColor,background:`${cardColor}18`,border:`1px solid ${cardColor}44`,borderRadius:20,padding:"3px 9px",textTransform:"capitalize",maxWidth:220,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>
                      {topic}
                    </span>
                    <span style={{fontSize:11,fontWeight:800,color:"#3f2f10",background:"#fff7ed",borderRadius:20,padding:"3px 9px",textTransform:"lowercase"}}>
                      {commentIntent(comment)}
                    </span>
                    <span style={{marginLeft:"auto",fontSize:11,color:"#f59e0b",fontWeight:800}}>
                      Likes {comment.likeCount || 0}
                    </span>
                    {comment.replyCount > 0 && (
                      <span style={{fontSize:11,color:"var(--text-muted)",fontWeight:800}}>Replies {comment.replyCount}</span>
                    )}
                  </div>

                  <div style={{fontSize:13,color:"var(--text)",fontWeight:700,lineHeight:1.6}}>
                    {highlightDemandText(comment.text || "", comment.demandMatches || [])}
                  </div>

                  {(comment.demandMatches || []).length > 0 && (
                    <div style={{display:"flex",flexWrap:"wrap",gap:5,marginTop:10}}>
                      {(comment.demandMatches || []).slice(0, 3).map((match) => (
                        <span key={match} style={{fontSize:10,fontWeight:800,color:"var(--green)",background:"#10b98122",border:"1px solid #10b98144",borderRadius:5,padding:"3px 8px"}}>
                          "{match}"
                        </span>
                      ))}
                    </div>
                  )}

                  {comment.publishedAt && (
                    <div style={{fontSize:11,color:"var(--text-dim)",marginTop:9}}>
                      {new Date(comment.publishedAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
              );})}
            </div>
          ) : (
            <div style={{fontSize:12,color:"var(--text-muted)"}}>No example comments available for this phone.</div>
          )}
        </div>
      )}
    </div>
  );
}
