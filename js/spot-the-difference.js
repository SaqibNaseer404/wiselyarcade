/* Spot the Difference — Wisely Arcade: 100 levels, 5 pictures.
   Two copies of a scene; the right one hides seeded differences.
   Lesson: slow down and really look — careful eyes find what rushing misses. */
(function () {
  'use strict';
  var MAX_LEVEL = 100;
  var SCENES = [[{"tag": "rect", "attrs": {"x": "6", "y": "6", "width": "628", "height": "468", "rx": "20"}, "name": "the sky", "fill": "#3730a3"}, {"tag": "circle", "attrs": {"cx": "540", "cy": "86", "r": "48"}, "name": "the big planet", "fill": "#f59e0b"}, {"tag": "circle", "attrs": {"cx": "86", "cy": "120", "r": "26"}, "name": "the small planet", "fill": "#38bdf8"}, {"tag": "path", "attrs": {"d": "M120 40 l7 15 16 2 -12 11 3 16 -14 -8 -14 8 3 -16 -12 -11 16 -2 z"}, "name": "a star", "fill": "#fde047"}, {"tag": "path", "attrs": {"d": "M470 190 l6 12 13 2 -10 9 3 13 -12 -7 -11 7 2 -13 -9 -9 13 -2 z"}, "name": "a star", "fill": "#fde047"}, {"tag": "path", "attrs": {"d": "M180 210 l5 11 12 1 -9 8 2 12 -10 -6 -10 6 2 -12 -9 -8 12 -1 z"}, "name": "a star", "fill": "#fde047"}, {"tag": "path", "attrs": {"d": "M320 372 C 296 410 306 448 320 462 C 334 448 344 410 320 372 Z"}, "name": "the flame", "fill": "#f97316"}, {"tag": "path", "attrs": {"d": "M272 300 C 240 330 232 366 236 386 C 254 378 268 366 278 348 Z"}, "name": "the left wing", "fill": "#ef4444"}, {"tag": "path", "attrs": {"d": "M368 300 C 400 330 408 366 404 386 C 386 378 372 366 362 348 Z"}, "name": "the right wing", "fill": "#ef4444"}, {"tag": "path", "attrs": {"d": "M320 66 C 362 118 374 190 368 300 L 368 356 L 272 356 L 272 300 C 266 190 278 118 320 66 Z"}, "name": "the rocket body", "fill": "#e2e8f0"}, {"tag": "path", "attrs": {"d": "M320 66 C 340 92 354 118 362 148 L 278 148 C 286 118 300 92 320 66 Z"}, "name": "the rocket nose", "fill": "#ef4444"}, {"tag": "circle", "attrs": {"cx": "320", "cy": "212", "r": "37"}, "name": "the window ring", "fill": "#facc15"}, {"tag": "circle", "attrs": {"cx": "320", "cy": "212", "r": "25"}, "name": "the window", "fill": "#38bdf8"}, {"tag": "rect", "attrs": {"x": "272", "y": "300", "width": "96", "height": "24"}, "name": "the stripe", "fill": "#3b82f6"}, {"tag": "ellipse", "attrs": {"cx": "540", "cy": "86", "rx": "72", "ry": "18", "stroke-width": "10"}, "name": "the planet ring", "fill": "#f472b6", "paint": "stroke"}, {"tag": "circle", "attrs": {"cx": "212", "cy": "58", "r": "13"}, "name": "the comet", "fill": "#e0f2fe"}, {"tag": "path", "attrs": {"d": "M222 66 L262 92 L228 80 L236 96 L208 74 Z"}, "name": "the comet tail", "fill": "#7dd3fc"}, {"tag": "circle", "attrs": {"cx": "592", "cy": "308", "r": "20"}, "name": "the moon", "fill": "#fef08a"}, {"tag": "rect", "attrs": {"x": "272", "y": "330", "width": "96", "height": "14"}, "name": "the second stripe", "fill": "#f59e0b"}, {"tag": "circle", "attrs": {"cx": "320", "cy": "272", "r": "11"}, "name": "the little window", "fill": "#38bdf8"}, {"tag": "rect", "attrs": {"x": "66", "y": "298", "width": "36", "height": "22", "rx": "4"}, "name": "the satellite", "fill": "#94a3b8"}, {"tag": "rect", "attrs": {"x": "24", "y": "292", "width": "36", "height": "30", "rx": "3"}, "name": "a solar panel", "fill": "#2563eb"}, {"tag": "rect", "attrs": {"x": "108", "y": "292", "width": "36", "height": "30", "rx": "3"}, "name": "a solar panel", "fill": "#2563eb"}, {"tag": "rect", "attrs": {"x": "270", "y": "166", "width": "100", "height": "9"}, "name": "the belt line", "fill": "#a855f7"}, {"tag": "path", "attrs": {"d": "M238 372 L262 356 L252 388 L236 388 Z"}, "name": "the left wing tip", "fill": "#dc2626"}, {"tag": "path", "attrs": {"d": "M402 372 L378 356 L388 388 L404 388 Z"}, "name": "the right wing tip", "fill": "#dc2626"}, {"tag": "path", "attrs": {"d": "M498 66 Q540 84 582 66", "stroke-width": "9"}, "name": "a planet band", "fill": "#fb923c", "paint": "stroke"}, {"tag": "path", "attrs": {"d": "M496 104 Q540 122 584 104", "stroke-width": "9"}, "name": "a planet band", "fill": "#fb923c", "paint": "stroke"}, {"tag": "path", "attrs": {"d": "M320 66 L320 30", "stroke-width": "7"}, "name": "the antenna", "fill": "#cbd5e1", "paint": "stroke"}, {"tag": "circle", "attrs": {"cx": "320", "cy": "24", "r": "8"}, "name": "the antenna light", "fill": "#ef4444"}, {"tag": "circle", "attrs": {"cx": "252", "cy": "452", "r": "16"}, "name": "a smoke puff", "fill": "#e2e8f0"}, {"tag": "circle", "attrs": {"cx": "392", "cy": "456", "r": "13"}, "name": "a smoke puff", "fill": "#e2e8f0"}, {"tag": "path", "attrs": {"d": "M428 44 l5 11 12 1 -9 8 2 12 -10 -6 -10 6 2 -12 -9 -8 12 -1 z"}, "name": "a tiny star", "fill": "#fde047"}, {"tag": "path", "attrs": {"d": "M96 268 l5 11 12 1 -9 8 2 12 -10 -6 -10 6 2 -12 -9 -8 12 -1 z"}, "name": "a tiny star", "fill": "#fde047"}, {"tag": "ellipse", "attrs": {"cx": "150", "cy": "428", "rx": "86", "ry": "24"}, "name": "a cloud", "fill": "#e0f2fe"}, {"tag": "ellipse", "attrs": {"cx": "500", "cy": "440", "rx": "104", "ry": "26"}, "name": "a cloud", "fill": "#e0f2fe"}], [{"tag": "rect", "attrs": {"x": "6", "y": "6", "width": "628", "height": "468", "rx": "20"}, "name": "the sky", "fill": "#7dd3fc"}, {"tag": "circle", "attrs": {"cx": "84", "cy": "76", "r": "34"}, "name": "the sun", "fill": "#fbbf24"}, {"tag": "path", "attrs": {"d": "M84 22 L84 34 M36 76 L48 76 M120 76 L132 76 M50 42 L59 51 M118 42 L109 51"}, "name": "the sun rays", "fill": "#f59e0b", "paint": "stroke", "sw": 9}, {"tag": "ellipse", "attrs": {"cx": "520", "cy": "84", "rx": "64", "ry": "22"}, "name": "a cloud", "fill": "#ffffff"}, {"tag": "ellipse", "attrs": {"cx": "140", "cy": "150", "rx": "52", "ry": "18"}, "name": "a cloud", "fill": "#ffffff"}, {"tag": "path", "attrs": {"d": "M468 402 Q536 282 604 402"}, "name": "the rainbow band", "fill": "#f59e0b", "paint": "stroke", "sw": 9}, {"tag": "path", "attrs": {"d": "M448 402 Q536 250 624 402"}, "name": "the rainbow", "fill": "#ef4444", "paint": "stroke", "sw": 9}, {"tag": "path", "attrs": {"d": "M138 102 Q150 90 162 102 Q174 90 186 102"}, "name": "a bird", "fill": "#33415e", "paint": "stroke", "sw": 9}, {"tag": "path", "attrs": {"d": "M452 158 Q462 148 472 158 Q482 148 492 158"}, "name": "a bird", "fill": "#33415e", "paint": "stroke", "sw": 9}, {"tag": "ellipse", "attrs": {"cx": "110", "cy": "452", "rx": "150", "ry": "42"}, "name": "the left hill", "fill": "#4ade80"}, {"tag": "ellipse", "attrs": {"cx": "540", "cy": "456", "rx": "160", "ry": "40"}, "name": "the right hill", "fill": "#22c55e"}, {"tag": "ellipse", "attrs": {"cx": "176", "cy": "416", "rx": "26", "ry": "14"}, "name": "a bush", "fill": "#16a34a"}, {"tag": "ellipse", "attrs": {"cx": "470", "cy": "412", "rx": "26", "ry": "14"}, "name": "a bush", "fill": "#16a34a"}, {"tag": "rect", "attrs": {"x": "202", "y": "176", "width": "58", "height": "224"}, "name": "the left tower", "fill": "#facc15"}, {"tag": "rect", "attrs": {"x": "380", "y": "176", "width": "58", "height": "224"}, "name": "the right tower", "fill": "#4ade80"}, {"tag": "rect", "attrs": {"x": "252", "y": "210", "width": "136", "height": "190"}, "name": "the castle", "fill": "#38bdf8"}, {"tag": "rect", "attrs": {"x": "202", "y": "252", "width": "58", "height": "14"}, "name": "the tower stripe", "fill": "#3b82f6"}, {"tag": "rect", "attrs": {"x": "380", "y": "252", "width": "58", "height": "14"}, "name": "the tower stripe", "fill": "#a855f7"}, {"tag": "path", "attrs": {"d": "M198 178 L231 116 L264 178 Z"}, "name": "the left roof", "fill": "#ec4899"}, {"tag": "path", "attrs": {"d": "M376 178 L409 116 L442 178 Z"}, "name": "the right roof", "fill": "#b45309"}, {"tag": "path", "attrs": {"d": "M252 212 L320 140 L388 212 Z"}, "name": "the middle roof", "fill": "#94a3b8"}, {"tag": "rect", "attrs": {"x": "252", "y": "238", "width": "136", "height": "14"}, "name": "the castle stripe", "fill": "#1e293b"}, {"tag": "path", "attrs": {"d": "M320 138 L320 100 L356 111 L320 124 Z"}, "name": "the castle flag", "fill": "#ef4444"}, {"tag": "path", "attrs": {"d": "M231 114 L231 84 L258 94 L231 103 Z"}, "name": "the left flag", "fill": "#f97316"}, {"tag": "path", "attrs": {"d": "M409 114 L409 84 L436 94 L409 103 Z"}, "name": "the right flag", "fill": "#facc15"}, {"tag": "rect", "attrs": {"x": "221", "y": "212", "width": "20", "height": "30", "rx": "9"}, "name": "a window", "fill": "#22d3ee"}, {"tag": "rect", "attrs": {"x": "399", "y": "212", "width": "20", "height": "30", "rx": "9"}, "name": "a window", "fill": "#22d3ee"}, {"tag": "circle", "attrs": {"cx": "320", "cy": "272", "r": "16"}, "name": "the top window", "fill": "#3b82f6"}, {"tag": "path", "attrs": {"d": "M290 400 L290 330 Q320 306 350 330 L350 400 Z"}, "name": "the gate", "fill": "#a855f7"}, {"tag": "circle", "attrs": {"cx": "320", "cy": "322", "r": "12"}, "name": "the round window", "fill": "#ec4899"}, {"tag": "path", "attrs": {"d": "M296 400 L344 400 L362 474 L278 474 Z"}, "name": "the path", "fill": "#d97706"}, {"tag": "circle", "attrs": {"cx": "120", "cy": "418", "r": "9"}, "name": "a flower", "fill": "#ec4899"}, {"tag": "circle", "attrs": {"cx": "512", "cy": "418", "r": "9"}, "name": "a flower", "fill": "#ec4899"}, {"tag": "circle", "attrs": {"cx": "88", "cy": "402", "r": "8"}, "name": "a flower", "fill": "#f43f5e"}, {"tag": "circle", "attrs": {"cx": "584", "cy": "410", "r": "7"}, "name": "a flower", "fill": "#f43f5e"}, {"tag": "path", "attrs": {"d": "M56 464 q4 -14 8 0 M72 466 q4 -12 8 0 M540 468 q4 -14 8 0 M556 470 q4 -12 8 0"}, "name": "the grass", "fill": "#16a34a", "paint": "stroke", "sw": 9}], [{"tag": "rect", "attrs": {"x": "6", "y": "6", "width": "628", "height": "468", "rx": "20"}, "name": "the sea", "fill": "#0ea5e9"}, {"tag": "path", "attrs": {"d": "M6 430 Q160 405 320 428 Q480 450 634 425 L634 474 L6 474 Z"}, "name": "the sand", "fill": "#fde68a"}, {"tag": "path", "attrs": {"d": "M376 474 C364 430 388 406 376 362 L394 362 C404 408 392 440 396 474 Z"}, "name": "the seaweed", "fill": "#22c55e"}, {"tag": "path", "attrs": {"d": "M52 474 C42 436 62 414 54 376 L72 374 C80 418 68 442 70 474 Z"}, "name": "the seaweed", "fill": "#22c55e"}, {"tag": "path", "attrs": {"d": "M602 472 L602 428 M602 446 L586 430 M602 440 L618 424 M586 430 L582 416 M618 424 L622 410"}, "name": "the coral", "fill": "#f97316", "paint": "stroke", "sw": 9}, {"tag": "ellipse", "attrs": {"cx": "245", "cy": "215", "rx": "92", "ry": "55"}, "name": "the big fish", "fill": "#f97316"}, {"tag": "path", "attrs": {"d": "M330 214 L388 168 Q372 214 388 258 Z"}, "name": "the fish tail", "fill": "#f97316"}, {"tag": "path", "attrs": {"d": "M222 166 Q248 136 280 164 Q250 155 222 166 Z"}, "name": "the fish fin", "fill": "#facc15"}, {"tag": "path", "attrs": {"d": "M238 170 Q228 215 238 260"}, "name": "a fish stripe", "fill": "#b45309", "paint": "stroke", "sw": 9}, {"tag": "path", "attrs": {"d": "M278 168 Q268 215 278 262"}, "name": "a fish stripe", "fill": "#b45309", "paint": "stroke", "sw": 9}, {"tag": "circle", "attrs": {"cx": "205", "cy": "200", "r": "10"}, "name": "the fish eye", "fill": "#1e293b"}, {"tag": "ellipse", "attrs": {"cx": "480", "cy": "330", "rx": "70", "ry": "46"}, "name": "the turtle shell", "fill": "#22c55e"}, {"tag": "circle", "attrs": {"cx": "462", "cy": "316", "r": "11"}, "name": "a shell spot", "fill": "#16a34a"}, {"tag": "circle", "attrs": {"cx": "502", "cy": "346", "r": "9"}, "name": "a shell spot", "fill": "#16a34a"}, {"tag": "circle", "attrs": {"cx": "562", "cy": "320", "r": "20"}, "name": "the turtle head", "fill": "#4ade80"}, {"tag": "ellipse", "attrs": {"cx": "438", "cy": "374", "rx": "22", "ry": "10"}, "name": "a flipper", "fill": "#16a34a"}, {"tag": "ellipse", "attrs": {"cx": "522", "cy": "378", "rx": "22", "ry": "10"}, "name": "a flipper", "fill": "#16a34a"}, {"tag": "path", "attrs": {"d": "M120 330 C120 295 155 272 185 272 C215 272 250 295 250 330 Z"}, "name": "the octopus head", "fill": "#a855f7"}, {"tag": "circle", "attrs": {"cx": "166", "cy": "300", "r": "8"}, "name": "the octopus eye", "fill": "#ffffff"}, {"tag": "circle", "attrs": {"cx": "204", "cy": "300", "r": "8"}, "name": "the octopus eye", "fill": "#ffffff"}, {"tag": "path", "attrs": {"d": "M130 330 C120 356 140 366 134 392 L156 392 C160 366 150 350 154 330 Z"}, "name": "an octopus tentacle", "fill": "#a78bfa"}, {"tag": "path", "attrs": {"d": "M172 332 C166 358 182 368 178 394 L200 394 C202 366 196 350 198 332 Z"}, "name": "an octopus tentacle", "fill": "#a78bfa"}, {"tag": "path", "attrs": {"d": "M216 330 C210 356 226 366 222 392 L244 392 C246 366 240 350 242 330 Z"}, "name": "an octopus tentacle", "fill": "#a78bfa"}, {"tag": "rect", "attrs": {"x": "452", "y": "392", "width": "104", "height": "58", "rx": "8"}, "name": "the treasure chest", "fill": "#b45309"}, {"tag": "path", "attrs": {"d": "M452 392 L452 374 Q504 350 556 374 L556 392 Z"}, "name": "the chest lid", "fill": "#d97706"}, {"tag": "rect", "attrs": {"x": "494", "y": "382", "width": "20", "height": "24", "rx": "4"}, "name": "the treasure lock", "fill": "#facc15"}, {"tag": "ellipse", "attrs": {"cx": "250", "cy": "442", "rx": "30", "ry": "16"}, "name": "the crab", "fill": "#ef4444"}, {"tag": "circle", "attrs": {"cx": "210", "cy": "430", "r": "11"}, "name": "a claw", "fill": "#f87171"}, {"tag": "circle", "attrs": {"cx": "290", "cy": "430", "r": "11"}, "name": "a claw", "fill": "#f87171"}, {"tag": "path", "attrs": {"d": "M150 408 l6 14 15 2 -11 10 3 15 -13 -8 -13 8 3 -15 -11 -10 15 -2 z"}, "name": "the starfish", "fill": "#f59e0b"}, {"tag": "path", "attrs": {"d": "M308 452 C304 430 318 416 330 416 C342 416 356 430 352 452 Z"}, "name": "a shell", "fill": "#f9a8d4"}, {"tag": "circle", "attrs": {"cx": "118", "cy": "118", "r": "14"}, "name": "a bubble", "fill": "#bae6fd"}, {"tag": "circle", "attrs": {"cx": "420", "cy": "92", "r": "12"}, "name": "a bubble", "fill": "#bae6fd"}, {"tag": "path", "attrs": {"d": "M60 255 L78 240 Q100 238 112 250 L126 238 L121 255 L126 272 L112 260 Q100 272 78 270 Z"}, "name": "a tiny fish", "fill": "#facc15"}, {"tag": "circle", "attrs": {"cx": "520", "cy": "150", "r": "8"}, "name": "a tiny bubble", "fill": "#bae6fd"}], [{"tag": "rect", "attrs": {"x": "6", "y": "6", "width": "628", "height": "468", "rx": "20"}, "name": "the room", "fill": "#fef9c3"}, {"tag": "path", "attrs": {"d": "M40 448 L600 448"}, "name": "the floor line", "fill": "#94a3b8", "paint": "stroke", "sw": 9}, {"tag": "path", "attrs": {"d": "M98 366 h24 v64 h-24 Z M78 386 h64 v24 h-64 Z M84 398 a26 26 0 1 0 52 0 a26 26 0 1 0 -52 0 Z"}, "name": "a gear", "fill": "#94a3b8"}, {"tag": "circle", "attrs": {"cx": "110", "cy": "398", "r": "10"}, "name": "the gear middle", "fill": "#64748b"}, {"tag": "path", "attrs": {"d": "M512 384 h20 v56 h-20 Z M494 402 h56 v20 h-56 Z M502 412 a20 20 0 1 0 40 0 a20 20 0 1 0 -40 0 Z"}, "name": "a gear", "fill": "#94a3b8"}, {"tag": "circle", "attrs": {"cx": "522", "cy": "412", "r": "8"}, "name": "the gear middle", "fill": "#64748b"}, {"tag": "rect", "attrs": {"x": "262", "y": "356", "width": "34", "height": "64"}, "name": "the left leg", "fill": "#60a5fa"}, {"tag": "rect", "attrs": {"x": "344", "y": "356", "width": "34", "height": "64"}, "name": "the right leg", "fill": "#60a5fa"}, {"tag": "rect", "attrs": {"x": "250", "y": "420", "width": "56", "height": "22", "rx": "8"}, "name": "the left foot", "fill": "#2563eb"}, {"tag": "rect", "attrs": {"x": "334", "y": "420", "width": "56", "height": "22", "rx": "8"}, "name": "the right foot", "fill": "#2563eb"}, {"tag": "rect", "attrs": {"x": "196", "y": "224", "width": "30", "height": "104", "rx": "14"}, "name": "the left arm", "fill": "#60a5fa"}, {"tag": "rect", "attrs": {"x": "414", "y": "224", "width": "30", "height": "104", "rx": "14"}, "name": "the right arm", "fill": "#60a5fa"}, {"tag": "rect", "attrs": {"x": "196", "y": "254", "width": "30", "height": "10"}, "name": "an arm stripe", "fill": "#facc15"}, {"tag": "rect", "attrs": {"x": "414", "y": "254", "width": "30", "height": "10"}, "name": "an arm stripe", "fill": "#facc15"}, {"tag": "circle", "attrs": {"cx": "211", "cy": "346", "r": "18"}, "name": "the left hand", "fill": "#fbbf24"}, {"tag": "circle", "attrs": {"cx": "429", "cy": "346", "r": "18"}, "name": "the right hand", "fill": "#fbbf24"}, {"tag": "rect", "attrs": {"x": "238", "y": "216", "width": "164", "height": "140", "rx": "16"}, "name": "the robot body", "fill": "#38bdf8"}, {"tag": "rect", "attrs": {"x": "252", "y": "312", "width": "136", "height": "9"}, "name": "the tummy stripe", "fill": "#0ea5e9"}, {"tag": "circle", "attrs": {"cx": "296", "cy": "332", "r": "9"}, "name": "a button", "fill": "#ef4444"}, {"tag": "circle", "attrs": {"cx": "344", "cy": "332", "r": "9"}, "name": "a button", "fill": "#22c55e"}, {"tag": "path", "attrs": {"d": "M258 246 l5 11 12 1 -9 8 2 12 -10 -6 -10 6 2 -12 -9 -8 12 -1 z"}, "name": "the star badge", "fill": "#f59e0b"}, {"tag": "rect", "attrs": {"x": "272", "y": "240", "width": "96", "height": "64", "rx": "10"}, "name": "the chest panel", "fill": "#e0f2fe"}, {"tag": "path", "attrs": {"d": "M320 293 C294 270 302 246 320 260 C338 246 346 270 320 293 Z"}, "name": "the heart light", "fill": "#ef4444"}, {"tag": "rect", "attrs": {"x": "296", "y": "192", "width": "48", "height": "24"}, "name": "the neck", "fill": "#94a3b8"}, {"tag": "rect", "attrs": {"x": "255", "y": "88", "width": "130", "height": "104", "rx": "18"}, "name": "the robot head", "fill": "#7dd3fc"}, {"tag": "rect", "attrs": {"x": "240", "y": "118", "width": "17", "height": "44", "rx": "6"}, "name": "the left ear", "fill": "#2563eb"}, {"tag": "rect", "attrs": {"x": "387", "y": "118", "width": "17", "height": "44", "rx": "6"}, "name": "the right ear", "fill": "#2563eb"}, {"tag": "rect", "attrs": {"x": "263", "y": "94", "width": "114", "height": "10", "rx": "5"}, "name": "the head stripe", "fill": "#a855f7"}, {"tag": "path", "attrs": {"d": "M320 88 L320 54"}, "name": "the antenna", "fill": "#64748b", "paint": "stroke", "sw": 9}, {"tag": "circle", "attrs": {"cx": "320", "cy": "42", "r": "11"}, "name": "the antenna light", "fill": "#ef4444"}, {"tag": "circle", "attrs": {"cx": "292", "cy": "132", "r": "13"}, "name": "the left eye", "fill": "#1e293b"}, {"tag": "circle", "attrs": {"cx": "348", "cy": "132", "r": "13"}, "name": "the right eye", "fill": "#1e293b"}, {"tag": "circle", "attrs": {"cx": "270", "cy": "158", "r": "8"}, "name": "a cheek", "fill": "#f9a8d4"}, {"tag": "circle", "attrs": {"cx": "370", "cy": "158", "r": "8"}, "name": "a cheek", "fill": "#f9a8d4"}, {"tag": "rect", "attrs": {"x": "292", "y": "160", "width": "56", "height": "12", "rx": "6"}, "name": "the robot mouth", "fill": "#1e293b"}], [{"tag": "rect", "attrs": {"x": "6", "y": "6", "width": "628", "height": "468", "rx": "20"}, "name": "the sky", "fill": "#7dd3fc"}, {"tag": "circle", "attrs": {"cx": "566", "cy": "72", "r": "32"}, "name": "the sun", "fill": "#fbbf24"}, {"tag": "path", "attrs": {"d": "M566 22 L566 32 M520 38 L528 46 M612 38 L604 46 M516 82 L526 82 M616 82 L606 82"}, "name": "the sun rays", "fill": "#f59e0b", "paint": "stroke", "sw": 9}, {"tag": "ellipse", "attrs": {"cx": "130", "cy": "84", "rx": "66", "ry": "22"}, "name": "a cloud", "fill": "#ffffff"}, {"tag": "ellipse", "attrs": {"cx": "330", "cy": "132", "rx": "44", "ry": "15"}, "name": "a cloud", "fill": "#ffffff"}, {"tag": "path", "attrs": {"d": "M250 108 Q262 94 274 108 Q286 94 298 108"}, "name": "a bird", "fill": "#33415e", "paint": "stroke", "sw": 9}, {"tag": "path", "attrs": {"d": "M330 72 Q340 62 350 72 Q360 62 370 72"}, "name": "a bird", "fill": "#33415e", "paint": "stroke", "sw": 9}, {"tag": "ellipse", "attrs": {"cx": "402", "cy": "118", "rx": "16", "ry": "10"}, "name": "a butterfly wing", "fill": "#c084fc"}, {"tag": "ellipse", "attrs": {"cx": "438", "cy": "118", "rx": "16", "ry": "10"}, "name": "a butterfly wing", "fill": "#c084fc"}, {"tag": "rect", "attrs": {"x": "416", "y": "102", "width": "8", "height": "32", "rx": "4"}, "name": "the butterfly body", "fill": "#7c3aed"}, {"tag": "path", "attrs": {"d": "M6 392 Q170 372 330 390 Q490 406 634 388 L634 474 L6 474 Z"}, "name": "the grass", "fill": "#4ade80"}, {"tag": "path", "attrs": {"d": "M6 348 h78 v10 h-78 Z M6 372 h78 v10 h-78 Z M14 340 h12 v56 h-12 Z M44 340 h12 v56 h-12 Z"}, "name": "the fence", "fill": "#b45309"}, {"tag": "path", "attrs": {"d": "M540 348 h94 v10 h-94 Z M540 372 h94 v10 h-94 Z M548 340 h12 v56 h-12 Z M578 340 h12 v56 h-12 Z M608 340 h12 v56 h-12 Z"}, "name": "the fence", "fill": "#b45309"}, {"tag": "rect", "attrs": {"x": "92", "y": "262", "width": "150", "height": "130"}, "name": "the little house", "fill": "#fef08a"}, {"tag": "path", "attrs": {"d": "M78 262 L167 196 L256 262 Z"}, "name": "the house roof", "fill": "#ef4444"}, {"tag": "rect", "attrs": {"x": "104", "y": "284", "width": "30", "height": "30", "rx": "4"}, "name": "a window", "fill": "#38bdf8"}, {"tag": "rect", "attrs": {"x": "200", "y": "284", "width": "30", "height": "30", "rx": "4"}, "name": "a window", "fill": "#38bdf8"}, {"tag": "rect", "attrs": {"x": "148", "y": "316", "width": "38", "height": "76", "rx": "4"}, "name": "the door", "fill": "#b45309"}, {"tag": "circle", "attrs": {"cx": "178", "cy": "354", "r": "6"}, "name": "the door knob", "fill": "#facc15"}, {"tag": "path", "attrs": {"d": "M452 392 L462 300 L478 300 L488 392 Z"}, "name": "the tree trunk", "fill": "#92400e"}, {"tag": "circle", "attrs": {"cx": "470", "cy": "238", "r": "66"}, "name": "the tree leaves", "fill": "#22c55e"}, {"tag": "circle", "attrs": {"cx": "438", "cy": "222", "r": "11"}, "name": "an apple", "fill": "#ef4444"}, {"tag": "circle", "attrs": {"cx": "466", "cy": "196", "r": "10"}, "name": "an apple", "fill": "#ef4444"}, {"tag": "circle", "attrs": {"cx": "312", "cy": "330", "r": "16"}, "name": "a sunflower", "fill": "#facc15"}, {"tag": "path", "attrs": {"d": "M312 346 L312 400"}, "name": "the sunflower stem", "fill": "#16a34a", "paint": "stroke", "sw": 9}, {"tag": "circle", "attrs": {"cx": "352", "cy": "344", "r": "13"}, "name": "a sunflower", "fill": "#facc15"}, {"tag": "path", "attrs": {"d": "M352 357 L352 402"}, "name": "the sunflower stem", "fill": "#16a34a", "paint": "stroke", "sw": 9}, {"tag": "rect", "attrs": {"x": "386", "y": "368", "width": "44", "height": "30", "rx": "5"}, "name": "the watering can", "fill": "#38bdf8"}, {"tag": "path", "attrs": {"d": "M388 376 L362 362 L368 350 L392 364 Z"}, "name": "the spout", "fill": "#0284c7"}, {"tag": "path", "attrs": {"d": "M430 368 Q454 376 430 398"}, "name": "the handle", "fill": "#0284c7", "paint": "stroke", "sw": 9}, {"tag": "circle", "attrs": {"cx": "70", "cy": "424", "r": "9"}, "name": "a flower", "fill": "#ec4899"}, {"tag": "circle", "attrs": {"cx": "120", "cy": "446", "r": "8"}, "name": "a flower", "fill": "#ec4899"}, {"tag": "circle", "attrs": {"cx": "470", "cy": "442", "r": "8"}, "name": "a flower", "fill": "#ec4899"}, {"tag": "path", "attrs": {"d": "M180 452 q4 -14 8 0 M196 454 q4 -12 8 0 M212 452 q4 -14 8 0"}, "name": "a grass tuft", "fill": "#16a34a", "paint": "stroke", "sw": 9}, {"tag": "path", "attrs": {"d": "M516 458 q4 -14 8 0 M532 460 q4 -12 8 0"}, "name": "a grass tuft", "fill": "#16a34a", "paint": "stroke", "sw": 9}]];
  var SCENE_NAMES = ['The Rocket', 'The Castle', 'Under the Sea', 'The Friendly Robot', 'The Garden'];
  var SCENE_EMOJI = ['🚀', '🏰', '🐠', '🤖', '🌻'];
  var COUNTS = [5, 6, 7, 8, 10];

  /* Difference pools: 12 per scene. part = index into the scene's parts.
     Types: colour (new fill/stroke), missing (absent on right), added (extra
     element on right), moved (dx/dy shift), resized (scale s about cx,cy).
     x,y,r = tap target in SVG units (right-hand position for moved parts). */
  var DIFFS = [
    [ /* Rocket */
      { part: 10, type: 'colour', to: '#22c55e', x: 320, y: 108, r: 36 },
      { part: 17, type: 'missing', x: 592, y: 308, r: 30 },
      { part: 1, type: 'colour', to: '#ec4899', x: 540, y: 86, r: 54 },
      { type: 'added', svg: '<path d="M448 282 l5 11 12 1 -9 8 2 12 -10 -6 -10 6 2 -12 -9 -8 12 -1 z" fill="#fde047"/>', x: 448, y: 298, r: 26 },
      { part: 2, type: 'moved', dx: 28, dy: 20, x: 114, y: 140, r: 34 },
      { part: 6, type: 'colour', to: '#38bdf8', x: 320, y: 416, r: 36 },
      { part: 29, type: 'missing', x: 320, y: 24, r: 20 },
      { part: 15, type: 'resized', s: 1.7, cx: 212, cy: 58, x: 212, y: 58, r: 26 },
      { part: 7, type: 'colour', to: '#a855f7', x: 256, y: 342, r: 42 },
      { part: 35, type: 'missing', x: 500, y: 440, r: 56 },
      { part: 13, type: 'colour', to: '#22c55e', x: 320, y: 312, r: 42 },
      { type: 'added', svg: '<circle cx="320" cy="452" r="15" fill="#e2e8f0"/>', x: 320, y: 452, r: 24 }
    ],
    [ /* Castle */
      { part: 22, type: 'colour', to: '#3b82f6', x: 336, y: 112, r: 26 },
      { part: 1, type: 'missing', x: 84, y: 76, r: 40 },
      { part: 18, type: 'colour', to: '#22c55e', x: 231, y: 148, r: 38 },
      { type: 'added', svg: '<circle cx="60" cy="436" r="9" fill="#ec4899"/>', x: 60, y: 436, r: 22 },
      { part: 27, type: 'moved', dx: -32, dy: 0, x: 288, y: 272, r: 24 },
      { part: 28, type: 'colour', to: '#ef4444', x: 320, y: 362, r: 40 },
      { part: 23, type: 'missing', x: 244, y: 94, r: 22 },
      { part: 3, type: 'resized', s: 1.35, cx: 520, cy: 84, x: 520, y: 84, r: 52 },
      { part: 14, type: 'colour', to: '#f97316', x: 409, y: 288, r: 46 },
      { part: 11, type: 'missing', x: 176, y: 416, r: 30 },
      { part: 6, type: 'colour', to: '#a855f7', x: 536, y: 268, r: 34 },
      { type: 'added', svg: '<path d="M288 122 Q298 112 308 122 Q318 112 328 122" fill="none" stroke="#33415e" stroke-width="5"/>', x: 308, y: 118, r: 24 }
    ],
    [ /* Under the Sea */
      { part: 5, type: 'colour', to: '#a855f7', x: 245, y: 215, r: 58 },
      { part: 10, type: 'missing', x: 205, y: 200, r: 18 },
      { part: 17, type: 'colour', to: '#ec4899', x: 185, y: 302, r: 46 },
      { type: 'added', svg: '<circle cx="300" cy="118" r="10" fill="#bae6fd"/>', x: 300, y: 118, r: 22 },
      { part: 14, type: 'moved', dx: 26, dy: -10, x: 588, y: 310, r: 27 },
      { part: 24, type: 'colour', to: '#ef4444', x: 504, y: 378, r: 42 },
      { part: 29, type: 'missing', x: 150, y: 424, r: 24 },
      { part: 31, type: 'resized', s: 1.7, cx: 118, cy: 118, x: 118, y: 118, r: 28 },
      { part: 26, type: 'colour', to: '#f97316', x: 250, y: 442, r: 32 },
      { part: 3, type: 'missing', x: 62, y: 424, r: 36 },
      { part: 11, type: 'colour', to: '#f59e0b', x: 480, y: 330, r: 56 },
      { type: 'added', svg: '<g transform="translate(200,110)"><path d="M60 255 L78 240 Q100 238 112 250 L126 238 L121 255 L126 272 L112 260 Q100 272 78 270 Z" fill="#f472b6"/></g>', x: 293, y: 365, r: 30 }
    ],
    [ /* Friendly Robot */
      { part: 22, type: 'colour', to: '#f59e0b', x: 320, y: 268, r: 24 },
      { part: 29, type: 'missing', x: 320, y: 42, r: 18 },
      { part: 24, type: 'colour', to: '#f9a8d4', x: 320, y: 140, r: 56 },
      { type: 'added', svg: '<circle cx="320" cy="332" r="9" fill="#a855f7"/>', x: 320, y: 332, r: 18 },
      { part: 30, type: 'moved', dx: 0, dy: -13, x: 292, y: 119, r: 18 },
      { part: 8, type: 'colour', to: '#ef4444', x: 278, y: 431, r: 30 },
      { part: 20, type: 'missing', x: 258, y: 258, r: 20 },
      { part: 15, type: 'resized', s: 1.45, cx: 429, cy: 346, x: 429, y: 346, r: 27 },
      { part: 21, type: 'colour', to: '#fde68a', x: 320, y: 272, r: 46 },
      { part: 26, type: 'missing', x: 395, y: 140, r: 22 },
      { part: 34, type: 'colour', to: '#ef4444', x: 320, y: 166, r: 28 },
      { type: 'added', svg: '<g transform="translate(124,0)"><path d="M258 246 l5 11 12 1 -9 8 2 12 -10 -6 -10 6 2 -12 -9 -8 12 -1 z" fill="#22c55e"/></g>', x: 382, y: 259, r: 20 }
    ],
    [ /* Garden */
      { part: 14, type: 'colour', to: '#3b82f6', x: 167, y: 230, r: 46 },
      { part: 1, type: 'missing', x: 566, y: 72, r: 38 },
      { part: 20, type: 'colour', to: '#f59e0b', x: 470, y: 238, r: 62 },
      { type: 'added', svg: '<circle cx="505" cy="262" r="10" fill="#ef4444"/>', x: 505, y: 262, r: 20 },
      { part: 4, type: 'moved', dx: 42, dy: 10, x: 372, y: 142, r: 36 },
      { part: 17, type: 'colour', to: '#22c55e', x: 167, y: 354, r: 28 },
      { part: 22, type: 'missing', x: 466, y: 196, r: 18 },
      { part: 23, type: 'resized', s: 1.5, cx: 312, cy: 330, x: 312, y: 330, r: 26 },
      { part: 27, type: 'colour', to: '#f97316', x: 408, y: 383, r: 28 },
      { part: 11, type: 'missing', x: 45, y: 368, r: 40 },
      { part: 13, type: 'colour', to: '#bae6fd', x: 167, y: 327, r: 56 },
      { type: 'added', svg: '<circle cx="560" cy="430" r="8" fill="#a855f7"/>', x: 560, y: 430, r: 20 }
    ]
  ];

  function diffCount(l) { return COUNTS[Math.floor((l - 1) / 20)]; }
  function sceneOf(l) { return (l - 1) % 5; }
  function seeded(seed) { var t = seed * 2654435761 % 4294967296; return function () { t = (t * 1664525 + 1013904223) % 4294967296; return t / 4294967296; }; }

  function rawPick(l) {
    var pool = DIFFS[sceneOf(l)];
    var k = diffCount(l);
    var rng = seeded(l * 131 + 7);
    var idx = pool.map(function (_, i) { return i; });
    for (var i = idx.length - 1; i > 0; i--) { var j = Math.floor(rng() * (i + 1)); var t = idx[i]; idx[i] = idx[j]; idx[j] = t; }
    return idx.slice(0, k);
  }
  function pickDiffs(l) {
    var pool = DIFFS[sceneOf(l)];
    var pick = rawPick(l);
    if (l > 5) {
      var prev = rawPick(l - 5);
      var same = prev.length === pick.length && prev.slice().sort().join(',') === pick.slice().sort().join(',');
      if (same) { /* shift the window so this visit's set differs from the last visit to this scene */
        var all = pool.map(function (_, i) { return i; });
        pick = pick.map(function (v) { return all[(v + 1) % all.length]; });
        var seen = {}, out = [];
        pick.forEach(function (v) { if (!seen[v]) { seen[v] = 1; out.push(v); } });
        all.forEach(function (v) { if (out.length < diffCount(l) && !seen[v]) { seen[v] = 1; out.push(v); } });
        pick = out;
      }
    }
    return pick.map(function (i) { var d = {}; for (var key in pool[i]) d[key] = pool[i][key]; d.found = false; d.hinted = false; return d; });
  }

  function partMarkup(p, mut) {
    var attrs = '';
    for (var k in p.attrs) attrs += ' ' + k + '="' + p.attrs[k] + '"';
    var paint = '';
    if (p.paint === 'stroke') {
      var col = mut && mut.type === 'colour' ? mut.to : p.fill;
      var w = p.attrs['stroke-width'] || p.sw || 9;
      paint = ' fill="none" style="stroke:' + col + ';stroke-width:' + w + '"';
    } else {
      var f = mut && mut.type === 'colour' ? mut.to : p.fill;
      paint = ' fill="' + f + '"';
    }
    var tr = '';
    if (mut && mut.type === 'moved') tr = ' transform="translate(' + mut.dx + ' ' + mut.dy + ')"';
    if (mut && mut.type === 'resized') tr = ' transform="translate(' + mut.cx + ' ' + mut.cy + ') scale(' + mut.s + ') translate(' + (-mut.cx) + ' ' + (-mut.cy) + ')"';
    return '<' + p.tag + ' class="sd-part"' + attrs + paint + tr + '/>';
  }
  function sceneMarkup(si, diffs) {
    var muts = {};
    var extras = '';
    if (diffs) diffs.forEach(function (d) {
      if (d.type === 'added') extras += d.svg.replace('/>', ' class="sd-part"/>');
      else muts[d.part] = d;
    });
    var out = '';
    SCENES[si].forEach(function (p, i) {
      var mut = muts[i];
      if (mut && mut.type === 'missing') return;
      out += partMarkup(p, mut);
    });
    return out + extras;
  }

  var svgL = document.getElementById('sd-svg-l');
  var svgR = document.getElementById('sd-svg-r');
  var marksL = document.getElementById('sd-marks-l');
  var marksR = document.getElementById('sd-marks-r');
  var msg = document.getElementById('sd-msg');
  var countEl = document.getElementById('sd-count');
  var timeEl = document.getElementById('sd-time');
  var misEl = document.getElementById('sd-mistakes');

  var cur = 1, unlocked = 1, starMap = {};
  try {
    cur = parseInt(localStorage.getItem('sd_current') || '1', 10) || 1;
    unlocked = parseInt(localStorage.getItem('sd_unlocked') || '1', 10) || 1;
    starMap = JSON.parse(localStorage.getItem('sd_stars') || '{}') || {};
  } catch (e) {}
  if (cur < 1) cur = 1; if (cur > MAX_LEVEL) cur = MAX_LEVEL;
  if (unlocked < cur) unlocked = cur;

  var diffs = [], found = 0, mistakes = 0, hintUsed = false, won = false;
  var timer = null, seconds = 0;

  function save() {
    try {
      localStorage.setItem('sd_current', String(cur));
      localStorage.setItem('sd_unlocked', String(unlocked));
      localStorage.setItem('sd_stars', JSON.stringify(starMap));
    } catch (e) {}
  }
  function fmt(s) { return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }
  function refreshStats() {
    countEl.textContent = found + ' / ' + diffs.length;
    misEl.textContent = mistakes;
    timeEl.textContent = fmt(seconds);
  }
  function ring(marks, d, cls) {
    var c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.setAttribute('cx', d.x); c.setAttribute('cy', d.y);
    c.setAttribute('r', d.r + 5); c.setAttribute('class', cls);
    marks.appendChild(c);
  }
  function buildMap() {
    var map = document.getElementById('sd-map');
    map.innerHTML = '';
    for (var l = 1; l <= MAX_LEVEL; l++) {
      (function (l) {
        var b = document.createElement('button');
        b.type = 'button';
        if (starMap[l] != null && l !== cur) { b.className = 'sd-lvl sd-done'; b.textContent = l + (starMap[l] >= 3 ? ' ⭐' : ''); }
        else if (l === cur) { b.className = 'sd-lvl sd-cur'; b.textContent = l; }
        else if (l <= unlocked) { b.className = 'sd-lvl'; b.textContent = l; }
        else { b.className = 'sd-lvl sd-lock'; b.textContent = '🔒'; }
        b.disabled = l > unlocked;
        b.setAttribute('aria-label', 'Level ' + l);
        b.addEventListener('click', function () { if (l <= unlocked) { cur = l; save(); startLevel(); } });
        map.appendChild(b);
      })(l);
    }
    document.getElementById('sd-level-now').textContent = cur;
    var doneCount = 0; for (var k in starMap) doneCount++;
    document.getElementById('sd-progress-note').textContent =
      SCENE_EMOJI[sceneOf(cur)] + ' ' + SCENE_NAMES[sceneOf(cur)] + ' · find ' + diffCount(cur) + ' differences · ' + doneCount + ' of 100 levels completed';
  }
  function startTimer() {
    if (timer) clearInterval(timer);
    timer = setInterval(function () { if (!won) { seconds++; timeEl.textContent = fmt(seconds); } }, 1000);
  }
  function startLevel() {
    var si = sceneOf(cur);
    diffs = pickDiffs(cur);
    found = 0; mistakes = 0; hintUsed = false; won = false; seconds = 0;
    svgL.innerHTML = sceneMarkup(si, null) + '<g id="sd-marks-l"></g>';
    svgR.innerHTML = sceneMarkup(si, diffs) + '<g id="sd-marks-r"></g>';
    marksL = document.getElementById('sd-marks-l');
    marksR = document.getElementById('sd-marks-r');
    document.getElementById('sd-done').classList.add('hidden');
    msg.textContent = 'Two pictures of ' + SCENE_NAMES[si] + ' — find ' + diffs.length + ' differences hiding in the right-hand picture!';
    buildMap();
    refreshStats();
    startTimer();
    window.__sd = {
      level: cur, scene: si, diffs: diffs,
      get found() { return found; }, get mistakes() { return mistakes; },
      get won() { return won; }
    };
  }
  function starsFor() {
    var s = mistakes === 0 ? 3 : mistakes <= 3 ? 2 : 1;
    if (hintUsed) s = Math.min(s, 2);
    return s;
  }
  function win() {
    won = true;
    if (timer) clearInterval(timer);
    var stars = starsFor();
    if (starMap[cur] == null || stars > starMap[cur]) starMap[cur] = stars;
    if (cur === unlocked && unlocked < MAX_LEVEL) unlocked++;
    save();
    buildMap();
    var stats = document.getElementById('sd-done-stats');
    stats.textContent = 'Level ' + cur + ' complete — ' + stars + ' of 3 stars! You found all ' + diffs.length +
      ' differences in ' + fmt(seconds) + ' with ' + mistakes + (mistakes === 1 ? ' mistake.' : ' mistakes.') +
      (cur < MAX_LEVEL ? ' Level ' + (cur + 1) + ' is unlocked — a new picture is waiting!' : ' You finished all 100 levels. What careful eyes you have!');
    document.getElementById('sd-done-title').textContent = stars === 3 ? '⭐⭐⭐ Eagle eyes!' : stars === 2 ? '⭐⭐ Sharp eyes!' : '⭐ You did it!';
    setTimeout(function () { document.getElementById('sd-done').classList.remove('hidden'); }, 450);
  }
  function svgPoint(svg, evt) {
    var rect = svg.getBoundingClientRect();
    return { x: (evt.clientX - rect.left) / rect.width * 640, y: (evt.clientY - rect.top) / rect.height * 480 };
  }
  function onTap(svg, wrap) {
    return function (evt) {
      if (won) return;
      var pt = svgPoint(svg, evt);
      var best = null, bestDist = 1e9;
      diffs.forEach(function (d) {
        if (d.found) return;
        var dist = Math.hypot(pt.x - d.x, pt.y - d.y);
        if (dist <= d.r && dist < bestDist) { best = d; bestDist = dist; }
      });
      if (best) {
        best.found = true;
        found++;
        ring(marksL, best, 'sd-ring');
        ring(marksR, best, 'sd-ring');
        refreshStats();
        msg.textContent = found === diffs.length ? 'You found them all! 🎉' :
          'You found one! ' + (diffs.length - found) + (diffs.length - found === 1 ? ' difference' : ' differences') + ' to go.';
        if (found === diffs.length) win();
      } else {
        var nearFound = diffs.some(function (d) { return d.found && Math.hypot(pt.x - d.x, pt.y - d.y) <= d.r; });
        if (nearFound) return; /* tapping an already-found spot is free */
        mistakes++;
        refreshStats();
        wrap.classList.remove('sd-wobble');
        void wrap.getBoundingClientRect();
        wrap.classList.add('sd-wobble');
        msg.textContent = 'Not there — slow down and really look. 👀';
      }
    };
  }
  svgL.addEventListener('click', onTap(svgL, document.getElementById('sd-wrap-l')));
  svgR.addEventListener('click', onTap(svgR, document.getElementById('sd-wrap-r')));

  document.getElementById('sd-hint').addEventListener('click', function () {
    if (won) return;
    var d = diffs.filter(function (x) { return !x.found && !x.hinted; })[0] || diffs.filter(function (x) { return !x.found; })[0];
    if (!d) return;
    d.hinted = true;
    hintUsed = true;
    ring(marksL, d, 'sd-hintring');
    ring(marksR, d, 'sd-hintring');
    msg.textContent = 'Look inside the golden dashed ring… something is different there!';
  });
  document.getElementById('sd-restart').addEventListener('click', startLevel);
  document.getElementById('sd-next').addEventListener('click', function () {
    if (cur < MAX_LEVEL) { cur++; save(); }
    startLevel();
  });
  document.getElementById('sd-again').addEventListener('click', startLevel);

  startLevel();
})();
