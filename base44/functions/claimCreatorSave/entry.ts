import { createClientFromRequest } from "npm:@base44/sdk";

// One-time save transfer: the second owner account (jasoncheungss1@gmail.com)
// gets a full copy of the creator's PlayerData (team, money, items, stones…)
// the first time it logs into the game with an empty team.
const CREATOR_ID = "6a7431d0e384662733bae099";
const OWNER_EMAILS = ["cheunc85@wis.edu.hk", "jasoncheungss1@gmail.com"];

export default async function (req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!OWNER_EMAILS.includes((user.email || "").toLowerCase())) {
    return Response.json({ error: "Not allowed" }, { status: 403 });
  }

  const service = base44.asServiceRole;

  // The creator's save (source of the transfer)
  const creatorRecords = await service.entities.PlayerData.filter({ created_by_id: CREATOR_ID });
  const creator = creatorRecords[0];
  if (!creator) return Response.json({ error: "No creator save found" }, { status: 404 });

  // The caller's own save — only copy when it is still empty
  const mine = await service.entities.PlayerData.filter({ created_by_id: user.id });
  const mineRec = mine[0];
  if (mineRec && (mineRec.team || []).length > 0) {
    return Response.json({ skipped: true, message: "This account already has its own team — nothing was copied." });
  }

  const copy = {
    money: creator.money || 0,
    exp: creator.exp || 0,
    badges: creator.badges || [],
    team: creator.team || [],
    stones: creator.stones || [],
    click_damage: creator.click_damage || 10,
    items: creator.items || [],
    random_ball_purchases: creator.random_ball_purchases || 0,
    last_team_reset: creator.last_team_reset || "",
    has_started: true,
    difficulty: creator.difficulty || "admin",
    duel_streak: creator.duel_streak || 0,
    duel_best_streak: creator.duel_best_streak || 0,
    duel_titles: creator.duel_titles || [],
    duel_locked: false,
  };

  if (mineRec) {
    await service.entities.PlayerData.update(mineRec.id, copy);
  } else {
    await service.entities.PlayerData.create({ ...copy, created_by_id: user.id });
  }
  return Response.json({ ok: true, copiedTeam: copy.team.length, money: copy.money });
}