const fs = require('fs');
const content = fs.readFileSync('src/pages/kaunselor/KaunslorClientFilePage.jsx', 'utf8');
const lines = content.split('\n');

// Lines 1-621 (0-indexed 0-620): keep — ends right before the broken Calendar/Consent comment
// Lines 952-end (0-indexed 951-): keep — starts at the Notes tab
const before = lines.slice(0, 621).join('\n');
const after = lines.slice(952).join('\n');

const inserted = `
          {/* ── PLANS TAB (action plans + referrals) ── */}
          {tab === 'plans' && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Action Plans</p>
              <Button onClick={() => setShowAddPlan(true)} className="w-full">+ New Action Plan</Button>
              {actionPlans.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <div className="text-3xl mb-2">📋</div>
                  <p className="text-sm">No action plans yet.</p>
                </div>
              ) : actionPlans.map(p => (
                <div key={p.id} className="bg-white rounded-xl border p-4 space-y-2">
                  <p className="text-xs text-gray-400">{format(parseISO(p.created_at), 'dd MMM yyyy')}</p>
                  {p.goals?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-1">Goals</p>
                      {p.goals.map((g, i) => (
                        <p key={i} className="text-sm text-gray-700">• {typeof g === 'string' ? g : g.goal}</p>
                      ))}
                    </div>
                  )}
                  {p.interventions?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-1">Interventions</p>
                      {p.interventions.map((iv, i) => <p key={i} className="text-sm text-gray-700">• {iv}</p>)}
                    </div>
                  )}
                  {p.follow_up_date && <p className="text-xs text-blue-600">Follow-up: {format(parseISO(p.follow_up_date), 'dd MMM yyyy')}</p>}
                  {p.notes && <p className="text-xs text-gray-500 italic">{p.notes}</p>}
                </div>
              ))}
              {showAddPlan && (
                <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
                    <h3 className="font-semibold text-lg">New Action Plan</h3>
                    <form onSubmit={handleAddPlan} className="space-y-3">
                      <div><label className="text-xs text-gray-500 mb-1 block">Goals *</label>
                        <textarea value={planForm.goals} onChange={e => setPlanForm(p => ({ ...p, goals: e.target.value }))} rows={2} required
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" placeholder="State client goals..." /></div>
                      <div><label className="text-xs text-gray-500 mb-1 block">Interventions</label>
                        <textarea value={planForm.interventions} onChange={e => setPlanForm(p => ({ ...p, interventions: e.target.value }))} rows={2}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" placeholder="Approach / technique used..." /></div>
                      <div><label className="text-xs text-gray-500 mb-1 block">Follow-up Date</label>
                        <input type="date" value={planForm.follow_up_date} onChange={e => setPlanForm(p => ({ ...p, follow_up_date: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                      <div><label className="text-xs text-gray-500 mb-1 block">Notes</label>
                        <input type="text" value={planForm.notes} onChange={e => setPlanForm(p => ({ ...p, notes: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Additional notes..." /></div>
                      <div className="flex gap-3 pt-2">
                        <Button type="submit" loading={savingPlan} className="flex-1">Save</Button>
                        <Button type="button" variant="secondary" onClick={() => setShowAddPlan(false)}>Cancel</Button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Referrals */}
              <div className="pt-4 border-t space-y-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Referrals</p>
                <div className="flex gap-2">
                  <Button onClick={() => setShowAddReferral(true)} className="flex-1">+ Professional Referral</Button>
                  {teamMembers.length > 0 && (
                    <Button variant="secondary" onClick={() => setShowTeamReferral(true)} className="flex-1">👥 Refer to Counselor</Button>
                  )}
                </div>
                {teamReferrals.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Team Referrals</p>
                    {teamReferrals.map(tr => (
                      <div key={tr.id} className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium text-blue-900">→ {tr.to_email}</p>
                            <p className="text-xs text-blue-700 mt-0.5">{tr.reason}</p>
                            {tr.notes && <p className="text-xs text-blue-600 italic mt-0.5">{tr.notes}</p>}
                            <p className="text-xs text-blue-400 mt-1">{format(parseISO(tr.created_at), 'dd MMM yyyy')}</p>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${tr.status === 'accepted' ? 'bg-green-100 text-green-700' : tr.status === 'declined' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                            {tr.status === 'accepted' ? 'Accepted' : tr.status === 'declined' ? 'Declined' : 'Pending'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {referrals.length === 0 && teamReferrals.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <div className="text-3xl mb-2">🏥</div>
                    <p className="text-sm">No referrals yet.</p>
                  </div>
                ) : referrals.map(r => {
                  const REFERRAL_LABELS = { psychiatry: 'Psychiatry', hospital: 'Hospital', social_welfare: 'Social Welfare', ngo: 'NGO / Charity', other: 'Others' };
                  return (
                    <div key={r.id} className="bg-white rounded-xl border p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{r.referred_to}</p>
                          <p className="text-xs text-gray-500">{REFERRAL_LABELS[r.referral_type] || r.referral_type}</p>
                          {r.reason && <p className="text-sm text-gray-600 mt-1">{r.reason}</p>}
                          <p className="text-xs text-gray-400 mt-1">{format(parseISO(r.created_at), 'dd MMM yyyy')}</p>
                        </div>
                        <Badge color={r.status === 'completed' ? 'green' : r.status === 'sent' ? 'blue' : 'yellow'}>
                          {r.status === 'completed' ? 'Completed' : r.status === 'sent' ? 'Sent' : 'Pending'}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
                {showAddReferral && (
                  <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
                      <h3 className="font-semibold text-lg">New Referral</h3>
                      <form onSubmit={handleAddReferral} className="space-y-3">
                        <div><label className="text-xs text-gray-500 mb-1 block">Referred To *</label>
                          <input type="text" value={referralForm.referred_to} onChange={e => setReferralForm(p => ({ ...p, referred_to: e.target.value }))} required
                            placeholder="e.g. Hospital, Psychiatry..."
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                        <div><label className="text-xs text-gray-500 mb-1 block">Referral Type</label>
                          <select value={referralForm.referral_type} onChange={e => setReferralForm(p => ({ ...p, referral_type: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                            {[['psychiatry','Psychiatry'],['hospital','Hospital'],['social_welfare','Social Welfare'],['ngo','NGO / Charity'],['other','Others']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                          </select></div>
                        <div><label className="text-xs text-gray-500 mb-1 block">Reason</label>
                          <textarea value={referralForm.reason} onChange={e => setReferralForm(p => ({ ...p, reason: e.target.value }))} rows={2}
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" /></div>
                        <div className="flex gap-3 pt-2">
                          <Button type="submit" loading={savingReferral} className="flex-1">Save</Button>
                          <Button type="button" variant="secondary" onClick={() => setShowAddReferral(false)}>Cancel</Button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

`;

const newContent = before + inserted + after;
fs.writeFileSync('src/pages/kaunselor/KaunslorClientFilePage.jsx', newContent, 'utf8');
console.log('Done. Lines:', newContent.split('\n').length);
