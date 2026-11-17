// FIND THE AI: GHOST PROTOCOL | RC09 campaign canon.
// Three established engines are extended into ten distinct authored missions.
// "world" selects the preserved maze/city/district engine, not the level number.
export const LEVELS=[
 {name:'SIGNAL MAZE',world:0,goal:0,spawns:2,respawn:8,brief:'Recover three code traces and collect SHIFT chips. Every correct answer matters.',theme:'signal'},
 {name:'NEON DISTRICT',world:1,goal:0,spawns:4,respawn:8,brief:'Disable the three city relays, track the Ghost, and survive the drone patrols.',theme:'neon'},
 {name:'AI STREETS',world:2,goal:0,spawns:17,respawn:8,brief:'Explore AI Streets, fly, find the upgrade garage, and restore the three relays.',theme:'streets'},
 {name:'BLACKOUT JUNCTION',world:1,goal:2,spawns:6,respawn:6.5,brief:'A city blackout: restore three relays and disable at least two pursuers.',theme:'blackout'},
 {name:'DRONE FOUNDRY',world:1,goal:4,spawns:8,respawn:5.5,brief:'The repair factory keeps recycling its security drones. Defeat four and shut down its relays.',theme:'foundry'},
 {name:'CIPHER VAULT',world:0,goal:0,spawns:5,respawn:7,brief:'A new maze hides three original security riddles. Repair drones guard the code vault.',theme:'vault'},
 {name:'SKY PURSUIT',world:2,goal:5,spawns:20,respawn:6.5,brief:'Take the fight above the city, disable five drones or ground guards, then restore all relays.',theme:'sky'},
 {name:'FIREWALL GAUNTLET',world:1,goal:6,spawns:9,respawn:5.0,brief:'Fight through fortified neon roads, disable six defenders and reach extraction.',theme:'firewall'},
 {name:'MIRROR LABYRINTH',world:0,goal:0,spawns:7,respawn:5.4,brief:'The Ghost copied the maze. Solve three new riddles and find the real exit.',theme:'mirror'},
 {name:'CLOSAI FORTRESS',world:2,goal:6,spawns:21,respawn:4.2,boss:true,brief:'Last mission: clear six defenders, disable the three shields and burn through the CLOSAI core.',theme:'cl osai'.replace(' ','')}
];
export const MISSION_QUESTIONS={
 5:[
  {clue:'ENCRYPTION: the key changes after each use. Why?',choices:['reduce key reuse','make files larger','disable verification'],answer:0,desc:'One-time keys limit the damage of compromised credentials.'},
  {clue:'CHECKPOINT: the source hash differs. Next?',choices:['overwrite source','inspect the mismatch','ignore the receipt'],answer:1,desc:'Never continue on an unverified source.'},
  {clue:'REPAIR LOG: a drone returns. What must happen first?',choices:['instant respawn','erase its history','reach the repair bay'],answer:2,desc:'The security drones physically return home before repair.'}
 ],
 8:[
  {clue:'MIRROR AI: identical responses, different sources. Trust?',choices:['provenance and evidence','whichever answers first','the loudest copy'],answer:0,desc:'Verify evidence, not impressions.'},
  {clue:'SHIFT SYSTEM: a power upgrade works in one level only. Fix?',choices:['restart everything','persist verified state','hide the display'],answer:1,desc:'Preserve progress through a controlled state store.'},
  {clue:'FINAL LOCK: three checks, one failed. Advance?',choices:['yes, automatically','delete the failed check','repair and verify again'],answer:2,desc:'Proof before the next stage.'}
 ]
};
export function missionQuestion(levelIndex,slot,base){
 const m=LEVELS[levelIndex];return MISSION_QUESTIONS[levelIndex]?.[slot]||base[m.world*3+slot];
}
