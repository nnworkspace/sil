import { matchesPiece, type Matchable, type MatchRule } from "@/lib/compendium/match";
import type { EntryGroup } from "@/lib/compendium/groups";

/**
 * The Materials glossary (SPEC-COMPENDIUM-FUNC §2.2, #213).
 *
 * Content as code, not rows (SPEC-COMPENDIUM-DATA §2): these are prose that
 * wants review, diffs and history, and there is no second author to coordinate
 * with. Adding an entry is a pull request.
 *
 * Every entry here is **anchored in the catalogue** (VAL-COMP-01): it exists
 * because pieces use it, and the counts beside each one are derived from the
 * catalogue, never written down. The terms stay in the language the trade uses
 * (VAL-COMP-02); the explanation is Chinese (VAL-COMP-03). Where a claim is an
 * inference rather than something known, `uncertain` says so (VAL-COMP-11).
 */

export type { EntryGroup } from "@/lib/compendium/groups";
export { ENTRY_GROUPS } from "@/lib/compendium/groups";

export type CompendiumEntry = {
  /** URL segment under /compendium/materials: a contract once linked to. */
  slug: string;
  term: string;
  alsoKnownAs?: string[];
  /** Where the word came from, when it illuminates the thing. */
  origin?: string;
  group: EntryGroup;
  /** Chinese prose. Rendered as Markdown, so paragraph breaks, emphasis and
   *  small tables are available where an entry has outgrown one paragraph. */
  explanation: string;
  /** The physical tell: how you know it in the hand. */
  recognise?: string;
  /** What it means to wear: drape, breathability, recovery, creasing, care.
   *  Rendered as Markdown, like `explanation`. */
  wearing?: string;
  /** Omitted ⇒ the entry deliberately matches nothing (VAL-COMP-10). */
  match?: MatchRule;
  seeAlso?: string[];
  /** What in this entry is inference rather than fact (VAL-COMP-11). */
  uncertain?: string;
};

/** Search the whole text, not just the composition label. */
const ALL_TEXT = ["material", "description", "notes"] as const;

export const COMPENDIUM_ENTRIES: CompendiumEntry[] = [
  // ── Fibres ────────────────────────────────────────────────────────────────
  {
    slug: "cotton",
    term: "Cotton",
    origin: "← Ar. quṭn (قطن)",
    group: "fibre",
    explanation:
      "棉是大多数衣橱里绝对的主力：天然纤维素纤维，吸湿、透气、亲肤，价格与耐用度都好。它的短板是弹性差：纯棉容易皱、被拉伸后回不去原样，所以贴身合体的款式常会掺一点氨纶。棉的手感差别几乎全部来自纱线与织法，而不是“棉”这个字本身：同样是 100% cotton，府绸挺括微凉，汗布柔软有垂坠，灯芯绒厚实起绒。",
    recognise:
      "Cool and dry to the touch, never slippery. Crush a corner in your fist: cotton holds the creases you just made, and the more tightly woven it is, the sharper they are.",
    wearing:
      "Machine washable and forgiving. Where a label adds a gsm figure (commonly somewhere from 120 to 270), that is the weight of the cloth: 120 is a summer shirt, 270 is nearly a sweatshirt.",
    match: { tokens: ["cotton"] },
    seeAlso: ["mercerised", "poplin", "jersey", "elastane"],
  },
  {
    slug: "silk",
    term: "Silk",
    alsoKnownAs: ["Mulberry silk"],
    group: "fibre",
    explanation:
      "真丝是蚕吐出的连续长丝，也是唯一天然的长丝纤维，这正是它光泽和垂坠的来源。标注 mulberry silk（桑蚕丝）是指用桑叶喂养的家蚕丝，比柞蚕丝更细、更白、更均匀。真丝调温性极好：夏天贴身凉，冬天又不冷；但怕汗、怕碱、怕摩擦，也怕阳光。",
    recognise:
      "Cool at first touch and then quickly warm: it takes your body temperature faster than cotton does. The lustre shifts as the cloth moves, rather than sitting flat on the surface like polyester satin.",
    wearing:
      "Hand-wash cold with a silk detergent and dry flat in the shade; never wring it. Deodorant and perspiration mark it permanently, so it is worth a moment's care before wearing.",
    match: { tokens: ["silk"] },
    seeAlso: ["satin", "crepe", "chiffon", "brocade"],
  },
  {
    slug: "wool",
    term: "Wool",
    alsoKnownAs: ["Merino", "Camelwool"],
    group: "fibre",
    explanation:
      "羊毛纤维表面有鳞片、内部呈天然卷曲，因此蓬松、保暖、回弹好，起皱后挂一晚多半自己就平了。美利奴（merino）指纤维直径细的羊毛，通常在 19 微米以下，是不扎皮肤的那一类；粗支羊毛扎人并不是“质量差”，只是纤维粗。羊毛也很能吸湿而不显湿，所以在潮冷天气里比棉舒服得多。",
    recognise:
      "Springy: press a fold flat and it lifts again. Held to the light the fibres look crimped rather than straight.",
    wearing:
      "Air it rather than washing it: wool sheds odour on its own. Heat plus agitation is what felts it, so if it must be washed, cold water and no rubbing.",
    match: { tokens: ["wool", "camelwool", "lambswool"] },
    seeAlso: ["cashmere", "elastane"],
  },
  {
    slug: "cashmere",
    term: "Cashmere",
    origin: "← Kashmir",
    group: "fibre",
    explanation:
      "羊绒来自山羊冬季的底层绒毛，纤维极细（约 14–16 微米）、极短。细，所以柔软不扎人；短，所以容易起球。起球是羊绒的天性，不是次品的证据。同等厚度下羊绒比羊毛暖得多，也轻得多，代价是耐磨性差。",
    recognise:
      "Warm to the touch immediately, and almost weightless for how warm it is. A single-ply featherweight knit will be slightly translucent held up to a window.",
    wearing:
      "Pill where it rubs: underarms, seatbelt line, bag strap. A cashmere comb rather than a razor. Fold, never hang: the weight of the garment stretches its own shoulders.",
    match: { tokens: ["cashmere"] },
    seeAlso: ["wool"],
  },
  {
    slug: "linen",
    term: "Linen",
    alsoKnownAs: ["Flax"],
    origin: "← L. linum",
    group: "fibre",
    explanation:
      "亚麻取自亚麻茎的韧皮纤维，是最古老的织物纤维之一。纤维中空、导热快，所以夏天穿着凉；强度高于棉，但几乎没有弹性，这就是它一坐就皱的原因。亚麻会随着水洗越洗越软，新买时的硬挺是暂时的。",
    recognise:
      "Slubs: the thread is deliberately uneven, so the surface has fine irregular thickenings. Crisp and slightly cool, and it creases the moment you sit.",
    wearing:
      "The creasing is the fabric, not a fault; a steamer helps, and travelling with linen means accepting it. Gets better with every wash.",
    match: { tokens: ["linen", "flax"] },
    seeAlso: ["hemp", "ramie", "cotton"],
  },
  {
    slug: "hemp",
    term: "Hemp",
    group: "fibre",
    explanation:
      "汉麻与亚麻同属韧皮纤维，性格也相近：透气、强韧、越洗越软，但更粗犷一些，手感初期偏硬。它比亚麻更耐磨，也更抗紫外线。",
    recognise: "Like linen but heavier-handed: a coarser, drier surface.",
    match: { tokens: ["hemp"] },
    seeAlso: ["linen", "ramie"],
  },
  {
    slug: "ramie",
    term: "Ramie",
    alsoKnownAs: ["China grass"],
    origin: "← Malay rami",
    group: "fibre",
    explanation:
      "苎麻取自苎麻茎的韧皮纤维，中国已经种了几千年，英文里也叫 China grass。它和亚麻、汉麻同属麻类，但性格更极端：吸湿导热比亚麻还快，上身更凉；强度是天然纤维里最高的几种之一，而且**湿了以后反而更强**，这一点和棉、丝正好相反。它还天然抗菌、抗霉，上色也牢。\n\n代价在于“脆”。纤维本身刚硬、几乎没有弹性，反复弯折的地方会疲劳，所以它比亚麻更易皱，折痕也更硬；长年压在同一道折线上，纤维真的会断。单穿还略带扎感。这就是市面上几乎见不到 100% 苎麻的原因。它通常与棉或粘胶混纺，混纺把凉爽和光泽留下，把脆和扎去掉大半。",
    recognise:
      "Linen's cool, dry hand, but with a faint sheen linen has not: the fibre is smoother and catches a little light. The giveaway is the crease: where linen rumples softly, ramie folds to a sharp, hard line.",
    wearing:
      "It creases harder than linen and the folds are stiffer, so 100% ramie wants pressing to look like anything, which makes it a poor match for a wardrobe that does not iron. **Prefer a blend.** Ramie with cotton or viscose keeps the coolness and the sheen and loses most of the brittleness.\n\nWorth a hand test before buying: on its own ramie can prickle, and a close-fitting cut presses more of it against the skin. A looser cut in the same cloth is a different garment.",
    match: { tokens: ["ramie", "ramié", "china grass"] },
    seeAlso: ["linen", "hemp", "cotton"],
  },
  {
    slug: "viscose",
    term: "Viscose",
    alsoKnownAs: ["Rayon"],
    group: "fibre",
    explanation:
      "粘胶纤维是“再生纤维素”：原料是木浆（天然），但要溶解后重新纺成丝（人造）。所以它既不是天然纤维也不是合成纤维。垂坠好、上色鲜艳、贴身凉滑，价格也低；缺点是湿态强度骤降，洗的时候最脆弱，也容易缩水、变形。很多“顺滑但不是真丝”的上衣就是它。",
    recognise:
      "Drapes heavily and hangs close to the body. Dry and slightly papery between the fingers compared with modal, which is unmistakably softer.",
    wearing:
      "Weakest when wet: wash gently and never wring. It breathes less well than its cool touch suggests, which is why one viscose top can feel stifling where another feels fine: that is the weave, not the fibre.\n\n**Blended with polyamide, watch the ratio rather than the fibre names.** Such knits tend to divide cleanly: soft below about a fifth polyamide, dry and scratchy at a third or more. See [Polyamide](/compendium/materials/polyamide).",
    match: { tokens: ["viscose", "viskose", "rayon"] },
    seeAlso: ["modal", "lyocell", "cupro", "polyamide"],
  },
  {
    slug: "modal",
    term: "Modal",
    group: "fibre",
    explanation:
      "莫代尔是粘胶的改良版，用山毛榉木浆、经过高湿模量工艺制成：湿强度比普通粘胶高得多，因此更耐洗、更不易缩水变形。手感是三者里最柔软的，也最贴身，常用于内衣和 T 恤。",
    recognise: "Softer and more fluid than viscose, and noticeably softer than lyocell.",
    match: { tokens: ["modal"] },
    seeAlso: ["viscose", "lyocell"],
  },
  {
    slug: "lyocell",
    term: "Lyocell",
    alsoKnownAs: ["Tencel™"],
    group: "fibre",
    explanation:
      "莱赛尔（天丝）同样是木浆再生纤维，但用的是闭环溶剂法：溶剂几乎全部回收，是三者中环境负担最小的。性能上它最“结实”：湿强度高、不易变形，垂坠好又带一点挺度。Tencel™ 是奥地利兰精公司的商标，不是另一种纤维。",
    recognise:
      "Cool and smooth like viscose but with more body: it holds a shape instead of collapsing. Prone to fibrillation: fine surface fuzz where it rubs.",
    match: { tokens: ["lyocell", "tencel"] },
    seeAlso: ["viscose", "modal", "cupro"],
  },
  {
    slug: "cupro",
    term: "Cupro",
    origin: "← cuprammonium",
    group: "fibre",
    explanation:
      "铜氨丝也是再生纤维素，用棉短绒（棉籽上剩下的极短纤维）在铜氨溶液中溶解纺成。它是这一族里最接近真丝的：极滑、极凉、垂坠强，所以常做高级衣服的里布，穿脱时不粘身。",
    recognise: "Slipperier and cooler than viscose; if a lining glides, it is often this.",
    match: { tokens: ["cupro", "bemberg"] },
    seeAlso: ["viscose", "lyocell", "silk"],
  },
  {
    slug: "acetate",
    term: "Acetate",
    alsoKnownAs: ["Acetat (Ger.)"],
    group: "fibre",
    explanation:
      "醋酸纤维也是从木浆来的，但它和粘胶走的是两条路：粘胶最后还原成纯纤维素，醋酸纤维则让纤维素和醋酸反应，变成一种新的酯，化学上已经不再是纤维素了。所以它的脾气更靠近合成纤维：不吸水、遇水强度下降、怕热。\n\n它有近乎真丝的光泽和凉滑的手感，价钱却低得多，于是成了西装、外套、连衣裙里布的标准答案：穿脱时滑，不粘身。代价是它几乎不能水洗：沾水后纤维膨胀变形，折痕会永久留下。**一件面料本身完全能洗的外套，往往就是因为这层里布，整件只能干洗。**\n\n它还有一个亲戚：**三醋酸纤维（triacetate）**，性格差别大到值得单独一条，见 [Triacetate](/compendium/materials/triacetate)。简单说：那一种能洗、不太皱，所以拿来做面料；这一种不能洗、一皱就留痕，所以多半只做里布。",
    recognise:
      "A cool, flat lustre, brighter than viscose but without silk's shifting sheen. Crush a corner in your fist: acetate creases sharply and the crease stays.",
    wearing:
      "**Nearly always the lining, and nearly always the reason a jacket says dry-clean only.** Check the lining before assuming a washable shell means a washable garment.\n\nIt melts rather than scorches, so an iron goes on the coolest setting, from the reverse, through a cloth. It dissolves in acetone: nail varnish remover on an acetate lining leaves a hole, not a stain.",
    // `triacetate` deliberately absent: it has its own entry (#261), and a
    // piece must land in exactly one. Both-sided boundaries mean `acetate`
    // cannot reach inside `triacetate` anyway, so nothing here needs excluding.
    match: { tokens: ["acetate", "acetat"] },
    seeAlso: ["triacetate", "viscose", "cupro", "silk", "crepe"],
  },
  {
    slug: "triacetate",
    term: "Triacetate",
    alsoKnownAs: ["Triacetat (Ger.)", "Arnel®"],
    group: "fibre",
    explanation:
      "三醋酸纤维和[醋酸纤维](/compendium/materials/acetate)是同一家的，做法也相近：都让木浆纤维素跟醋酸反应，变成一种酯。区别在于**反应做得更彻底**：纤维素上几乎所有的羟基都被替换掉了。听起来只是化学细节，穿起来却是两种东西。\n\n**它最大的好处是不皱。** 普通醋酸一折就留痕，而且痕迹回不去；三醋酸挺括、回弹、还能定型褶（那些洗了还在的百褶裙，很多就是它）。旅行时这一点特别值钱：挂一夜，第二天不用熨。\n\n**第二个好处是能洗。** 普通醋酸沾水就膨胀变形，基本只能干洗；三醋酸可以冷水轻柔机洗。所以它做得了外层面料，而不像它的亲戚那样多半只当里布。\n\n**要留意的是两点。** 一是**怕高温**：熨斗只能开最低档，它是熔化而不是烧焦，一旦熔了就回不来。二是**不吸汗**：化学上它已经不算纤维素了，吸湿性接近合成纤维。凉、滑、垂坠感都很好，但在闷热天里贴身穿久了会捂着。夏天在家整天穿的衣服，还是选亚麻或棉。",
    recognise:
      "Smooth and cool with a dry, matt-leaning lustre: less shiny than acetate, less fluid than viscose. The real tell is the fist test: crush a corner and let go. Acetate keeps the crease; triacetate largely lets it fall out.",
    wearing:
      "**The travel fibre.** Cold gentle machine wash, hang to dry, and it needs no iron, which is most of what makes a garment worth packing. Pleats survive washing, which is why pleated skirts are so often made of it.\n\n**Low iron or none.** It melts rather than scorches, so there is no recovering a shine or a flattened patch.\n\n**Not for a hot day spent still.** It barely absorbs moisture, so it does not do what linen does: it feels cool to the touch and then traps. Good for a dress worn out; poor for one worn all afternoon in a warm flat.",
    match: { tokens: ["triacetate", "triacetat"] },
    seeAlso: ["acetate", "viscose", "polyester", "crepe"],
  },
  {
    slug: "acrylic",
    term: "Acrylic",
    alsoKnownAs: ["Polyacrylic", "Polyacryl (Ger.)"],
    group: "fibre",
    explanation:
      "腈纶是合成纤维里最像羊毛的一种：轻、蓬松、保暖，能染出羊毛染不出的鲜艳颜色，而且便宜、不缩水、不怕虫蛀。它常常用来替代羊毛，或与羊毛混纺把成本压下来。\n\n两个短处很明显。一是**起球**：纤维本身强度高，起了球反而不容易自然脱落，会牢牢挂在表面，越穿越明显。二是**怕热**，熨斗一压就塌，滚筒烘干会让它永久发硬。它也不吸湿，贴身穿闷、起静电。\n\n在混纺里占比不高时，它主要贡献蓬松和颜色；占大头时，衣服的寿命基本由它决定。",
    recognise:
      "Wool-like loft, but it never feels cool and it warms in the hand almost at once. Real wool has a faint crimp you can feel; acrylic is smoother and squeaks very slightly between the fingers.",
    wearing:
      "Comb the pills off rather than pulling them: the fibre is strong enough that pulling takes the cloth with it. Cool wash, dry flat, and keep it away from the iron entirely if you can.",
    match: { tokens: ["acrylic", "polyacrylic", "polyacryl", "acryl"] },
    seeAlso: ["wool", "polyester", "cashmere"],
  },
  {
    slug: "metallic-yarn",
    term: "Metallic yarn",
    alsoKnownAs: ["Lurex®", "Metallised fibre"],
    group: "fibre",
    explanation:
      "衣服上的“闪光”通常不是印上去或涂上去的，而是**一根真正的线织进了布里**：把极薄的铝箔夹在两层聚酯薄膜之间，再切成极细的条，Lurex 这类金属丝就是这么做的。\n\n因为发光的是金属本身，它不会像涂层那样洗掉、磨掉。反过来，它的弱点也全在“薄膜”两个字上：熨斗直接压上去会熔化、发黏、失去光泽。它偏硬、不吸湿，所以一般只占很小的比例，或者只出现在花纹处。\n\n还有一件事值得知道：**照片几乎拍不出它。** 金属丝靠的是随角度变化的反射，静止的一张图只能抓住其中一个角度，人在动的时候才看得到全部的闪。",
    recognise:
      "Hold it under a light and move it. A woven metallic sparkles in shifting points as the angle changes; a printed or foiled shine stays flat and wears away first at the folds.",
    wearing:
      "**Never put an iron directly on it.** Press from the reverse or through a cloth, cool. Otherwise it is durable: the sparkle outlasts the garment, because it is not a surface treatment.",
    // `metallic` alone is too broad: a leather belt's description may list a
    // "Metallic finish", which is a coating on leather and the opposite of a
    // yarn woven in. So the bare word is not a token, but the phrases that mean
    // the thread are (the #225 `cord` lesson: prefer precision by construction
    // over a blocklist). `lamé` is kept accented; unaccented `lame` matched
    // nothing useful and is an ordinary English word, so it is left out.
    match: {
      tokens: [
        "metallised",
        "metallized",
        "lurex",
        "lamé",
        "metallic yarn",
        "metallic thread",
        "metallic fibre",
        "metallic fiber",
      ],
      fields: ["material", "description"],
    },
    uncertain:
      "A composition label often does not name it: the metal thread may be counted inside the polyester figure, or omitted as trim. A jacket can list no metallic fibre at all, yet visibly have one, which is why this entry reads the description as well as the label.",
    seeAlso: ["brocade", "polyester", "satin"],
  },
  {
    slug: "polyamide",
    term: "Polyamide",
    alsoKnownAs: ["Nylon"],
    group: "fibre",
    explanation:
      "锦纶（尼龙）是合成纤维里最耐磨、强度最高的一种，弹性回复也好。它常与氨纶搭档出现在贴身、塑形或运动的衣物上。68% polyamide / 32% elastane 这类配比就是典型。缺点是不吸湿、易起静电，闷。\n\n**和粘胶混纺时，锦纶的比例几乎决定手感。** 粘胶／锦纶针织外搭扎不扎人，往往和这个比例高度吻合：锦纶占三成以上的干硬扎皮肤，不到两成的柔软舒适。原因在于锦纶多是加工丝（变形长丝），捻度高、表面硬；占比高时它主导织物表面，占比低时表面由粘胶决定，凉滑而有垂坠。买之前看得到的数字就是这个比例。",
    recognise: "Smooth, faintly slick, and very strong: hard to tear by hand.",
    wearing:
      "Dries fast. Holds odour more than natural fibres do, so it wants washing after wear.\n\n**In a viscose blend the proportion decides the hand, and roughly 20% is the line.** Viscose-polyamide knits tend to fall either side of it, and how they feel tracks the number closely: at a third or more polyamide, dry and scratchy; below a fifth, soft enough to wear against the skin. Polyamide is usually a textured filament, high-twist and hard-surfaced, so when it dominates the yarn it dominates what the skin meets. Below a fifth, the viscose sets the surface and the cloth is cool and fluid.",
    match: { tokens: ["polyamide", "polyamid", "nylon"] },
    uncertain:
      "The 20% line is drawn from a handful of garments, not from a standard. Construction is the confound: the harsh examples are often also compact double-knits with no loft, and a loose knit at 35% might well feel different. Read it as a shopping heuristic (the ratio is the number printed on the label, which is why it is worth having), not as a physical constant.",
    seeAlso: ["viscose", "elastane", "polyester", "double-faced"],
  },
  {
    slug: "polyester",
    term: "Polyester",
    group: "fibre",
    explanation:
      "涤纶是产量最大的合成纤维：便宜、结实、不皱、不缩水、不褪色，也几乎不吸湿。不吸湿意味着汗留在皮肤上，所以贴身穿容易闷，但作为外套面料、里布或填充物的外壳，这个缺点无关紧要。它也可以被做得很像别的东西：涤纶缎面看起来像真丝，直到你摸到它不随体温变化。",
    recognise:
      "Stays at room temperature no matter how long you hold it. A polyester satin shines evenly and coldly; silk's lustre moves.",
    match: { tokens: ["polyester"] },
    seeAlso: ["polyamide", "satin"],
  },
  {
    slug: "elastane",
    term: "Elastane",
    alsoKnownAs: ["Spandex", "Lycra®"],
    group: "fibre",
    explanation:
      "氨纶提供的是拉伸能力，几乎从不单独使用，2% 到 6% 就足以改变一件衣服的性格。但要注意：拉得开是氨纶的功劳，回得去却主要看底布。同样是 5%，织得紧密的棉府绸会回弹，松散的针织仍会松垮；这也是为什么两件含氨纶比例相近的上衣，领口的表现可能完全不同。氨纶怕高温、怕氯，会随时间老化失去弹性。",
    recognise: "Stretch that snaps back. Old elastane goes slack and slightly wavy at the edges.",
    wearing:
      "Wash cool and never tumble-dry hot: heat is what kills it. A garment that has gone baggy at the knees or the neckline has usually lost its elastane, not its shape.",
    match: { tokens: ["elastane", "elastan", "spandex", "lycra"] },
    seeAlso: ["polyamide", "cotton"],
  },

  // ── Constructions ─────────────────────────────────────────────────────────
  {
    slug: "jersey",
    term: "Jersey",
    origin: "← the island of Jersey",
    group: "construction",
    explanation:
      "汗布（单面针织布）是最基本的针织结构：正面全是纵向的“V”字线圈，反面是横向的弧线。因为是线圈而非交织，它天生有弹性、柔软、贴身，即使不含一丝氨纶。T 恤、多数针织上衣都是它。它的固有毛病是边缘会卷（curling），所以下摆和领口通常要加罗纹或折边。",
    recognise:
      "Turn it inside out: the two faces look completely different. Cut edges roll towards the front.",
    wearing: "Comfortable and forgiving; stretches out over a day and recovers in the wash.",
    match: { tokens: ["jersey"], fields: [...ALL_TEXT] },
    seeAlso: ["rib", "cotton"],
  },
  {
    slug: "rib",
    term: "Rib",
    group: "construction",
    explanation:
      "罗纹是正针与反针交替排列的针织结构（1×1、2×2 等），因此在横向上比汗布弹性大得多，而且会自动收缩回去。领口、袖口、下摆用罗纹，就是要它箍得住。整件用罗纹的上衣则会明显贴合身形。",
    recognise:
      "Vertical ridges that pull in when relaxed and open when stretched. A ribbed welt at the hem is also the tell that a knit was **knitted to shape** rather than cut from a length of cloth.",
    // "rib" must not catch "ribbon", which really turns up in product copy. Both-sided token boundaries already handle it; the exclusion is
    // belt and braces, and the test pins the behaviour either way.
    match: { tokens: ["rib", "ribbed", "ribbing"], exclude: ["ribbon"], fields: [...ALL_TEXT] },
    seeAlso: ["jersey", "knitted-to-shape"],
  },
  {
    slug: "poplin",
    term: "Poplin",
    alsoKnownAs: ["Broadcloth"],
    origin: "← Fr. popeline, ← It. papalina (the papal cloth of Avignon)",
    group: "construction",
    explanation:
      "府绸是平纹梭织，但经纱远密于纬纱，因此表面有极细的横向罗纹感，光滑、致密、微微发亮。它是衬衫的经典面料：挺括、垂坠适中、耐洗。密度高也意味着不太透气，夏天的府绸衬衫凉在触感而不在通风。",
    recognise:
      "Smooth and crisp with a faint horizontal grain; holds a pressed crease sharply. Cool to the hand.",
    match: { tokens: ["poplin"], fields: [...ALL_TEXT] },
    seeAlso: ["cotton", "mercerised"],
  },
  {
    slug: "satin",
    term: "Satin",
    origin: "← Ar. zaytūnī, after Quanzhou (刺桐), the port it was shipped from",
    group: "construction",
    explanation:
      "缎纹是一种织法，不是一种材料。这一点常被混淆。缎纹让经纱大面积浮在表面、交织点尽量分散，于是光线均匀反射，产生那种流动的光泽。真丝缎、涤纶缎、棉缎都存在，光泽相似而手感天差地别。浮线长也意味着容易勾丝。",
    recognise:
      "One face glossy, the other matt. Snags easily on rings and rough nails: that is the long floating thread being caught.",
    match: { tokens: ["satin", "sateen"], fields: [...ALL_TEXT] },
    seeAlso: ["silk", "polyester", "brocade"],
  },
  {
    slug: "crepe",
    term: "Crêpe",
    origin: "← Fr. crêpe, ← L. crispus (curled)",
    group: "construction",
    explanation:
      "绉是靠强捻纱线织成的织物：纱线被加了极高的捻度，织好后回弹收缩，于是表面形成细密不规则的颗粒感。它因此不反光、不易皱，垂坠沉稳，很适合需要“看起来讲究但不能娇气”的场合。",
    recognise: "A fine pebbled surface with no shine; it hangs in soft columns rather than folds.",
    match: { tokens: ["crepe", "crêpe"], fields: [...ALL_TEXT] },
    seeAlso: ["silk", "chiffon"],
  },
  {
    slug: "chiffon",
    term: "Chiffon",
    origin: "← Fr. chiffon (rag), from chiffe (cloth)",
    group: "construction",
    explanation:
      "雪纺同样用强捻纱，但织得极稀薄，于是几乎透明、轻若无物，带一点点粗糙的手感（这是强捻纱的痕迹，不是质量问题）。因为透，通常需要衬里或内搭。",
    recognise: "Sheer, weightless, and very slightly rough, not slippery like a thin satin.",
    match: { tokens: ["chiffon"], fields: [...ALL_TEXT] },
    seeAlso: ["crepe", "silk"],
  },
  {
    slug: "denim",
    term: "Denim",
    origin: "← Fr. serge de Nîmes",
    group: "construction",
    explanation:
      "牛仔布是斜纹梭织：经纱染靛蓝、纬纱留白，所以正面偏蓝、反面偏白，也因此磨损处会露出白芯，这正是牛仔越穿越有痕迹的原因。斜纹结构比平纹更耐磨、更有垂感。",
    recognise:
      "Diagonal ridges running corner to corner; blue face, **pale back**. Roll a cuff: if the underside is lighter than the face, it is denim.",
    match: { tokens: ["denim"], fields: [...ALL_TEXT] },
    seeAlso: ["chambray", "cotton"],
  },
  {
    // #273. Added because a shirt dress was filed as denim on the strength of a
    // photograph (the rolled cuff looked two-tone) and turned out to be
    // chambray once the cloth was in hand. The Compendium
    // existed for exactly that distinction and could not make it.
    slug: "chambray",
    term: "Chambray",
    origin: "← Cambrai, the French town that wove it",
    group: "construction",
    explanation:
      "钱布雷是平纹梭织：经纱染靛蓝、纬纱留白，一上一下交织，所以**正反两面颜色一样**，整体呈现均匀的浅蓝，表面还带着细小的白点。\n\n它常被误认成牛仔布。两者的染色思路完全相同，区别只在织法：牛仔是斜纹、经面组织，正面深、反面浅；钱布雷是平纹，两面一致。也正因为是平纹、克重轻，钱布雷柔软透气，适合做衬衫和连衣裙，而不是裤子。",
    recognise:
      "**The same colour on both sides**: that is the whole test. Roll a cuff: a paler underside means denim, a matching one means chambray. Flat surface with no diagonal ridge, and fine white flecks where the weft shows through.",
    wearing:
      "Shirt-weight and soft from new, where denim starts stiff and softens with wear. Breathable. It creases like any cotton, but the fleck hides it. Machine washable.",
    // The word is not in a composition label: it is a weave, and it lives in
    // prose where anyone bothers to name it at all.
    match: { tokens: ["chambray"], fields: [...ALL_TEXT] },
    seeAlso: ["denim", "cotton", "poplin"],
  },
  {
    slug: "corduroy",
    term: "Corduroy",
    group: "construction",
    explanation:
      "灯芯绒是起绒织物：额外的纬纱被割开、形成一条条竖向绒条。绒条的粗细用 wale（条/英寸）表示，数字越大条越细，fine-wale 就是细条。绒面有方向性，顺光逆光颜色会不同，裁剪时必须同向。",
    recognise: "Raised vertical cords you can feel with a fingertip; the colour shifts with the nap.",
    wearing: "Brush along the cords, not across. Turn inside out to wash so the pile is protected.",
    // No bare `cord` token. It was kept once on the grounds that all five of
    // its hits were genuinely corduroy, which was true, and beside the point:
    // every one of them says *corduroy* too, so the token added no coverage at
    // all. It then matched a knitted top whose seams are described as "a rolled
    // cord", which is a different thing entirely. Zero benefit, real risk.
    match: { tokens: ["corduroy", "needlecord", "babycord"], fields: [...ALL_TEXT] },
    seeAlso: ["velvet", "cotton"],
  },
  {
    slug: "seersucker",
    term: "Seersucker",
    origin: "← Pers. shīr o shakar (شیر و شکر), 'milk and sugar'",
    group: "construction",
    explanation:
      "泡泡纱在织造时让部分经纱张力不同，织好后自然形成一条条起皱的凸纹。凸起处让布料与皮肤之间留有空隙，因此格外透气凉爽，而且天生就皱，不需要熨。夏装的聪明解法。",
    recognise: "Alternating flat and puckered stripes, permanent and woven in, not pressed.",
    match: { tokens: ["seersucker"], fields: [...ALL_TEXT] },
    seeAlso: ["cotton", "linen"],
  },
  {
    slug: "brocade",
    term: "Brocade",
    origin: "← It. broccato (embossed cloth), ← brocco (twisted thread)",
    group: "construction",
    explanation:
      "织锦缎是提花织物：花纹是在织机上用额外的纬纱织出来的，不是印上去或绣上去的。所以反面能看到浮长的线，正面的图案有厚度和光泽差。厚重、挺括，多用于礼服与外套。",
    recognise:
      "The pattern has relief you can feel, and the reverse shows floating threads. Printed cloth has neither.",
    match: { tokens: ["brocade"], fields: [...ALL_TEXT] },
    seeAlso: ["satin", "silk"],
  },
  {
    slug: "double-faced",
    term: "Double-faced",
    alsoKnownAs: ["Double-knit", "Doubleface"],
    group: "construction",
    explanation:
      "双面织物是把两层织物在织造时就结合成一体：正反两面都是完成面，各有各的颜色和肌理，没有所谓的“反面”。因为是两层互锁的结构，布边既不卷也不脱散，所以它可以直接裁开不做任何包边、罗纹或折边，这正是很多极简设计敢留毛边的原因。同样的道理也让它比单面布挺括、有身骨，能撑起 A 字或茧型的廓形而不塌。",
    recognise:
      "Turn it inside out: the reverse is a finished surface in its own colour, not a paler wrong side. Look at a cut edge: it lies flat instead of curling, which single jersey never does.",
    wearing:
      "It holds a shape away from the body, so it drapes in planes rather than folds. And since neither face is wrong, a piece can often be worn inside out: the only tells are the seam allowances and the label.",
    match: {
      tokens: ["double-faced", "double faced", "doubleface", "double-knit", "double knit"],
      fields: [...ALL_TEXT],
    },
    uncertain:
      "Labels rarely say it. This entry finds the pieces whose description happens to record it, so the list is certainly shorter than the number of double-faced pieces actually in the wardrobe.",
    seeAlso: ["jersey", "rib", "knitted-to-shape"],
  },
  {
    slug: "velvet",
    term: "Velvet",
    group: "construction",
    explanation:
      "丝绒是双层织造后割开形成的密集短绒面。绒毛的倒向决定光泽，所以同一件衣服不同角度深浅不同。压痕难以完全恢复，收纳时怕重压。",
    recognise: "Dense short pile; run a hand one way and it darkens, the other way it lightens.",
    match: { tokens: ["velvet", "velour"], fields: [...ALL_TEXT] },
    seeAlso: ["corduroy"],
  },
  {
    slug: "lace",
    term: "Lace",
    group: "construction",
    explanation:
      "蕾丝是以纱线打结、绞缠或绣制形成的镂空织物，本身没有底布。现代成衣多用经编蕾丝（machine-made），弹性和牢度都比传统手工蕾丝好，但图案重复规律。",
    recognise: "An openwork pattern with no ground fabric behind it.",
    // `lace-up` is a fastening, not a fabric, and the hyphen is a token
    // boundary, so without this exclusion every lace-up shoe would land here.
    match: { tokens: ["lace"], exclude: ["lace-up"], fields: [...ALL_TEXT] },
    seeAlso: ["chiffon"],
  },

  {
    slug: "jacquard",
    term: "Jacquard",
    origin: "← Joseph-Marie Jacquard",
    group: "construction",
    explanation:
      "提花不是一种材质，而是一种**织法**：图案是直接织进布里的，既不是印上去的，也不是绣上去的。\n\n普通织机只能成组地提起经线，所以花型必然是规律的。提花机的关键在于它能控制**每一根经线**，因此可以织出任意复杂的图案。它由 Joseph-Marie Jacquard 在 1804 年用穿孔卡片实现。同一套思路后来直接启发了早期计算机的程序卡。\n\n因为图案是织出来的，它不会洗掉也不会磨掉；代价是反面常有浮线，布也比平纹更厚、更挺。",
    recognise:
      "Turn it inside out. A jacquard shows the pattern again in reverse, often with loose floats; a print leaves a blank ground, and embroidery sits on top of the cloth rather than being part of it.",
    wearing:
      "Holds its shape and drapes less than a plain weave of the same fibre: welcome in a structured jacket, stiff in a blouse. Long floats on the reverse can catch on a ring or a watch clasp.",
    match: { tokens: ["jacquard"], fields: [...ALL_TEXT] },
    seeAlso: ["brocade", "boucle", "metallic-yarn"],
  },
  {
    slug: "boucle",
    term: "Bouclé",
    origin: "← Fr. bouclé, “looped”",
    group: "construction",
    explanation:
      "布雷（bouclé）的特征全在**纱线**上，不在织法上。纺纱时让其中一根线以更快的速度送出，它便在表面堆出一个个小圈，bouclé 在法语里就是“打成圈的”。所以它摸上去疙疙瘩瘩、蓬松而不平整，香奈儿式粗花呢外套是最为人熟知的例子。\n\n因为表面是一个个线圈，它**特别容易勾丝**：首饰、包带、拉链都能把圈抽出来。反过来，这些线圈困住了空气，所以在同样的重量下它比光滑的布更暖、也更显蓬松。\n\n**最容易混淆的一点**：布雷和提花常被放在一起说，因为两者都“有质感”。但质感的来源完全不同：布雷是纱线本身成圈，提花是用光滑的纱线织出图案。用指甲一挑就分得开：前者挑得起线圈，后者挑不起。",
    recognise:
      "Look at the surface edge-on: bouclé is built from visible loops you can lift with a fingernail. If the texture is flat to the touch and only the pattern varies, it is a weave (a jacquard), not a bouclé.",
    wearing:
      "It snags rather than pills. Ease a pulled loop back through from the reverse with a needle; never cut it, because one cut loop can release its neighbours.",
    match: { tokens: ["bouclé", "boucle"], fields: [...ALL_TEXT] },
    seeAlso: ["jacquard", "wool", "brocade"],
  },

  // ── Finishes ──────────────────────────────────────────────────────────────
  {
    slug: "mercerised",
    term: "Mercerised cotton",
    alsoKnownAs: ["Mercerized"],
    origin: "← John Mercer, who patented the process in 1844",
    group: "finish",
    explanation:
      "丝光棉是一道后整理工艺：棉纱在张力下用碱液处理，纤维截面由扁平的带状膨胀成圆形。结果是光泽显著提高、上色更鲜艳、强度增加、也更不容易缩水。它仍然是 100% 棉：“丝光”说的是工艺，不是掺了丝。",
    recognise: "A quiet sheen on a fabric that is otherwise unmistakably cotton, and a smoother hand.",
    match: { tokens: ["mercerised", "mercerized"], fields: [...ALL_TEXT] },
    seeAlso: ["cotton", "poplin"],
  },
  {
    slug: "brushed",
    term: "Brushed",
    group: "finish",
    explanation:
      "磨毛是用带刺的滚筒把织物表面的纤维刮起一层细绒。手感立刻变得柔软温暖，也更保暖，因为绒面能困住空气。代价是表面更容易起球，颜色也会略显灰哑。",
    recognise: "A soft nap on a fabric whose weave is still visible underneath.",
    match: { tokens: ["brushed"], fields: [...ALL_TEXT] },
    seeAlso: ["cotton", "wool"],
  },
  {
    slug: "knitted-to-shape",
    term: "Knitted to shape",
    alsoKnownAs: ["Fully fashioned", "全成型"],
    group: "finish",
    explanation:
      "全成型是指衣片在针织机上直接按身形加减针织出来，而不是从一大块针织布上裁下来再缝。好处是边缘不会被剪断、不脱散、不卷边，肩线和收腰是“织”出来的，穿着更贴合也更耐久。这类工艺通常成本更高。",
    recognise:
      "A ribbed welt at the hem and cuffs that is part of the knitting rather than a sewn-on band, and shaping lines that follow the body without a cut seam.",
    // No reliable textual signature: it is a manufacturing method, rarely
    // written on a label. The entry explains without claiming examples
    // (VAL-COMP-10) beyond the one piece where it was recorded by hand.
    match: { tokens: ["knitted-to-shape", "fully fashioned"], fields: [...ALL_TEXT] },
    uncertain:
      "Almost no garment says this on its label, so the piece list here will always be far shorter than the number of pieces that actually are knitted to shape. Read the absence as missing data, not as evidence.",
    seeAlso: ["rib", "cashmere"],
  },

  // ── Cuts ──────────────────────────────────────────────────────────────────
  {
    slug: "bolero",
    term: "Bolero",
    alsoKnownAs: ["Shrug"],
    origin: "← Sp. bolero, a dance",
    group: "cut",
    explanation:
      "### 行业里的原意\n\n博莱罗是一种**短到腰线以上、前面不扣起来的小外搭**。名字来自西班牙的同名舞蹈：舞者的上衣既不能妨碍手臂抬起，也要露出腰线。\n\n定义它的是**剪裁**，不是材质：针织的、蕾丝的、缎面的、带里布的小外套都可以是博莱罗。按这个原意，判断只有两问：**短不短**，**能不能扣上**。答案要是“短、且扣不上”。\n\n所以严格说来，一件能扣起来的短开衫不算博莱罗，它就是一件短开衫。真正的分界在于：博莱罗是为“敞开来搭在外面”而做的，它从来不是一件可以单穿的上衣。\n\n**它解决的问题很具体**：一条无袖或细吊带的连衣裙，在办公室、餐厅或晚间需要遮一下肩和上臂；但套一件正常长度的外套会把裙子的线条拦腰截断。博莱罗只盖住肩膀和上臂，把腰线以下完整地留给裙子。\n\n**这一段要记住**：商家写商品页时用的是这个原意。看到 bolero 这个词，对方指的多半是“敞开的短外搭”。\n\n### 这个 app 里的用法\n\n这个 app 把 Boleros 这一类**故意用得更宽**：**扣不扣得上不重要**（#245）。判断换成另外两条，两条都要满足：\n\n1. **下摆在腰线以上**，哪怕只是看上去在以上。这一条最关键，也最容易被“cropped”这个词骗：有些短西装确实短，但下摆正落在腰上，那就不算。\n2. **领口是干净的**：圆领、V 领、立领都行，**但不能有西装领（翻领）**。有翻领的短西装还是西装。\n\n按这两条，短西装、短开衫、短夹克、甚至一件超短的府绸衬衫，都可以收在这里。典型的博莱罗是罩在外面穿的，但这不是硬性条件。\n\n**为什么第一条要靠自己判断：**下摆落在哪里是关于**身体**的事，不是关于衣服的事。同一件衣服穿在不同人身上，位置就不同，商品图更看不出来。所以这一条只能由穿的人试穿决定，写在描述里的“ends at the natural waist”之类的话并不可靠，那多半是照着照片写的。\n\n这是为了自己好找而定的分类，不是行业标准。两个意思都留在这里：**买东西时用上面那个，在这个 app 里找东西时用下面这个。**",
    recognise:
      "**In the trade**, two quick tests: does it end at or above the waist, and can it be fastened shut? A bolero answers yes, then no.\n\n**In this app**, the fastening question is dropped and replaced by the neckline. Two tests, both required:\n\n1. **The hem sits above the waist**, or looks as though it does. Some genuinely cropped blazers fail this: they are short, but they land *on* the waist.\n2. **A clean neckline**: round, V or stand. **A notch lapel disqualifies it**: a short blazer with lapels is still a blazer.\n\nBeing a layer is typical but not required: a cropped poplin shirt qualifies.\n\n**Only the second test is one I can apply.** Where a hem falls is a fact about the wearer, not the garment, and no product shot shows it, so a description reading *ends at the natural waist* proves nothing, several having been written from photographs.",
    wearing:
      "A layer, never an outfit: what goes underneath is the outfit. Because it stops at the waist it leaves the leg line unbroken, which is why it suits a dress that a hip-length jacket would spoil.",
    // Reads the description as well as the label: a cut is described in prose
    // and will never appear in a composition string.
    match: { tokens: ["bolero", "shrug"], fields: [...ALL_TEXT] },
    uncertain:
      "Two different things are called Bolero here, and neither is wrong. The **trade** definition requires an open front; **this catalogue** deliberately drops that requirement and keeps only 'ultra-cropped layer' (#245). The entry states both rather than choosing, because a wearer needs the strict one to read a product page and the wide one to find their own clothes.\n\nThe list below is separately unreliable: it is found in prose, so it undercounts. A cut is not written on a label, and a piece whose description never happens to use the word will not appear however plainly it is one. **The authoritative list is the Boleros category**, not this find.",
    seeAlso: ["knitted-to-shape", "lace", "boucle"],
  },
  {
    slug: "a-line",
    term: "A-line",
    origin: "← Christian Dior, 1955",
    group: "cut",
    explanation:
      "A 字型是从肩或胸口开始、一路向下张开的直线轮廓，像字母 A。腰上不收，所以身体的宽窄不进入这件衣服的计算。\n\n名字是 Dior 1955 年那一季起的。它之所以到今天还在，是因为它对身形几乎不挑：把视线交给下摆的那条斜线，而不是腰线。\n\n这是最常见的连衣裙廓形之一。\n\n**张开的程度是连续的。** 从只张开一点点（很多直身裙其实都算），到伞形（swing）那样张成一个圆锥，中间没有分界线。所以一件衣服同时被标成 a-line 和 shift 并不矛盾：前者说下摆，后者说腰。",
    recognise:
      "Lay it flat: the side seams run outward in a straight diagonal from the underarm to the hem, with no inward curve at the waist.",
    wearing:
      "Forgiving and easy to sit in, because nothing is fitted at the middle. The flare is what makes it cool in summer: air moves under it.",
    match: { tokens: ["a-line"], fields: [...ALL_TEXT] },
    seeAlso: ["shift", "swing", "fit-and-flare"],
  },
  {
    slug: "shift",
    term: "Shift",
    group: "cut",
    explanation:
      "直身连衣裙**整件挂在肩膀上**：没有腰缝，腰上不收也不放，布料从肩直落下来，只是擦过身体。\n\n这个词来自 1920 年代：衣服第一次从束腰的结构上“移开”（shift），重心交给肩膀。英文里更早的 shift 就指一件最简单的、直筒的贴身衣。\n\n**它和 A 字不是互斥的**，这一点值得说清楚。直身讲的是**腰**（没有腰缝），A 字讲的是**下摆**（向外张）。一件衣服完全可以两样都是：比如 Maison Verre 的两条裙子，商家自己的文案写的是“a straight A-line shift”，试穿后的感觉却是“微微的 A 字，不是大 A 字”。张开的程度是一个连续的量，不是有或没有。\n\n真正和直身相对的是**紧身（sheath）**：紧身贴着腰和臀走，直身不理会它们。",
    recognise:
      "No waist seam anywhere, and the side seams fall straight rather than flaring. Held on a hanger it keeps its own shape instead of collapsing inward.",
    wearing:
      "**The most comfortable dress shape there is**, and the reason is structural: with nothing fitted at the waist there is no single correct position on the body, so sitting, bending and curling up do not fight it.\n\nIt asks something of the cloth in exchange. A shift has no seams to shape it, so a limp fabric hangs like a sack and a crisp one holds the line. Linen, poplin and fine wool suit it; a soft jersey usually does not.",
    match: { tokens: ["shift"], fields: [...ALL_TEXT] },
    seeAlso: ["a-line", "sheath", "tunic"],
  },
  {
    slug: "sheath",
    term: "Sheath",
    group: "cut",
    explanation:
      "紧身直筒是**贴着身体走**的廓形：腰收进去，臀放出来，靠省道和侧缝把布料塑成身体的形状。名字里的 sheath 是“刀鞘”，意思很直白：衣服是身体的鞘。\n\n它是直身（shift）的反面。同样看起来是一条直线，但直身让布料自己垂下来，紧身让布料跟着身体转。\n\n因为它贴身，面料通常要带一点弹性，否则坐下就绷。",
    recognise:
      "Darts at the bust and often at the waist, and side seams that curve inward and then out again. On a hanger it looks narrower at the middle than at the hem.",
    wearing:
      "It needs the body to carry it, and it shows what it is over, which is the point when that is wanted and the difficulty when it is not. Least forgiving of the shapes here for sitting through a long meal.",
    match: { tokens: ["sheath"], fields: [...ALL_TEXT] },
    seeAlso: ["shift", "column", "fit-and-flare"],
  },
  {
    slug: "fit-and-flare",
    term: "Fit-and-flare",
    group: "cut",
    explanation:
      "收腰喇叭的结构一句话说得完：**上身合体，腰上有一道缝，下面放开**。那道腰缝是整件衣服的支点。\n\n它的好处是给出一个明确的腰线，坏处也在同一个地方：腰缝在身上只有一个正确的位置。买大一号并不会变成“宽松版”，只会让腰缝落错地方。\n\n所以它适合出门穿，不适合在家整天穿：坐下、蜷着、弯腰，都会和那道缝较劲。",
    recognise: "A horizontal seam at or near the waist, with the skirt gathered or panelled below it.",
    wearing:
      "**Sizing up does not loosen it, it misplaces it.** Ease has to come from a shape that has no waist seam at all, not from a larger size of one that has.",
    match: { tokens: ["fit-and-flare", "fit and flare"], fields: [...ALL_TEXT] },
    seeAlso: ["a-line", "swing", "sheath"],
  },
  {
    slug: "wrap",
    term: "Wrap",
    origin: "← Diane von Fürstenberg, 1974",
    group: "cut",
    explanation:
      "裹身是**一片布交叠到另一片上，再系起来**：没有拉链，也不用套头。腰的松紧由系带决定，所以同一件衣服在不同的日子可以松一点或紧一点。\n\nDiane von Fürstenberg 1974 年的裹身裙让它成为一个标准款。它讨人喜欢的原因是可调，麻烦也来自同一处：交叠的地方会走位，弯腰时尤其。\n\n注意它和“系带”不是一回事：腰上系一条带子的直身裙仍然是直身裙。裹身指的是**门襟本身**是交叠的。",
    recognise:
      "One front panel crosses over the other and is held by a tie, usually through a small opening at the side seam. Undone, it lies flat and open rather than forming a tube.",
    wearing:
      "Adjustable, which is its whole appeal. The overlap is the thing to watch: a deep V that behaves standing may not when reaching, and a wrap skirt tends to travel round the body as you walk.",
    match: {
      tokens: ["wrap dress", "wrap top", "wrap skirt", "wrap-front", "wrap front"],
      fields: [...ALL_TEXT],
    },
    seeAlso: ["shift", "a-line"],
  },
  {
    slug: "tunic",
    term: "Tunic",
    origin: "← L. tunica",
    group: "cut",
    explanation:
      "长上衣是**长过臀、宽松、通常配裤子穿**的上装（介于上衣和短裙之间的长度）。名字来自拉丁语 tunica，古罗马人穿的那件直筒长衣。\n\n它的用处很具体：既盖住臀和大腿上部，又不像连衣裙那样必须单穿。夏天配一条窄裤，是最省事的一套。\n\n和直身裙的界线只在长度：短过某个点它是上衣，长过就是裙子；中间那一段就叫 tunic。",
    recognise: "Loose, straight, and long enough to cover the hip, but not long enough to wear alone.",
    wearing:
      "Wants something narrow underneath: the volume on top only reads as deliberate against a slim leg. Over a wide trouser it can become shapeless.",
    match: { tokens: ["tunic"], fields: [...ALL_TEXT] },
    seeAlso: ["shift", "a-line"],
  },
  {
    slug: "swing",
    term: "Swing",
    group: "cut",
    explanation:
      "伞形（swing）比 A 字**张得更急也更多**：布料从一个很高的点（肩线或一道过肩）就放开，所以走动时下摆会自己摆动，名字就是这么来的。\n\n它盛行于 1950 年代，也常见于同名的 swing coat。\n\n和 A 字的区别是程度而不是种类：A 字是一条斜线，伞形是一个圆锥。布料用得多，所以垂坠感全看面料的重量。",
    recognise: "Far more hem than the shoulders need: laid flat it is closer to a quarter-circle than a triangle.",
    wearing:
      "Moves when you move, which is the appeal. It also adds visual width at the hem, so it does most for a narrow frame and least under a coat.",
    match: { tokens: ["swing dress", "swing shape", "swing coat"], fields: [...ALL_TEXT] },
    seeAlso: ["a-line", "fit-and-flare"],
  },
  {
    slug: "column",
    term: "Column",
    group: "cut",
    explanation:
      "直筒长身（column）是一条**从肩到脚踝几乎等宽的垂直线**，像一根柱子。不收腰，也不放摆。\n\n它靠的是长度和连贯，而不是形状：因为没有横向的断点，整个人被读成一条线，所以显高。代价是它对面料的要求最高：太薄会贴，太厚会撑，必须垂得下来。\n\n和紧身（sheath）不同：紧身贴着身体的曲线，直筒长身只是直着落下去，中间并不贴。",
    recognise: "Same width at the shoulder, the waist and the hem, and long, usually to the ankle.",
    wearing:
      "Reads as one unbroken line, which is what makes it lengthening. Nothing about it is adjustable, so it lives or dies on the fabric's drape.",
    match: { tokens: ["column dress", "column silhouette"], fields: [...ALL_TEXT] },
    seeAlso: ["sheath", "shift"],
  },
];

export function findEntry(slug: string): CompendiumEntry | undefined {
  return COMPENDIUM_ENTRIES.find((e) => e.slug === slug);
}

/**
 * A group's entries, **in alphabetical order** by term (#275).
 *
 * `COMPENDIUM_ENTRIES` is written in a deliberate order (fibres run naturals,
 * then regenerated cellulose, then synthetics), and that order still matters
 * everywhere it is *reasoned* with: `entriesForPiece` reads as a sentence
 * because of it, and the material filter's dropdown keeps it.
 *
 * It is the wrong order to **look something up in**. A group page is consulted,
 * not read: you arrive knowing you want *lyocell*, and the only question is
 * where on the page it sits. Alphabetical answers that without being told the
 * taxonomy first. `localeCompare` rather than `<` so *Crêpe de Chine* files
 * under C.
 */
export const byTerm = (a: { term: string }, b: { term: string }) =>
  a.term.localeCompare(b.term, "en");

export function entriesInGroup(group: EntryGroup): CompendiumEntry[] {
  return COMPENDIUM_ENTRIES.filter((e) => e.group === group).sort(byTerm);
}

/**
 * The entries that describe a piece: the other half of the two-way link
 * (`VAL-COMP-09`, #213 phase 3).
 *
 * Kept in declaration order, which runs fibres → constructions → finishes: what
 * it is made of, then how that was made into cloth, then what was done to the
 * cloth afterwards. That is the order the facts depend on each other in, so it
 * reads as a sentence rather than as a list.
 *
 * Returns `[]` freely. An item page must not gain an empty section, so the
 * caller renders nothing at all when this is empty.
 */
export function entriesForPiece(piece: Matchable): CompendiumEntry[] {
  return COMPENDIUM_ENTRIES.filter((e) => matchesPiece(e.match, piece));
}

export const entryHref = (slug: string) => `/compendium/materials/${slug}`;
