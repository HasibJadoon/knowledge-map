-- Verb government + antonyms seed (AL) — worked roots ز ل ف and خ ل ص.
-- Apply to km_arabic_linguistic.

INSERT OR REPLACE INTO ar_ling_verb_government (id, root_norm, verb_form, verb_ar, transitivity, harf, meaning_en, meaning_ar, qr_ref, sort_order, status) VALUES
('VG:زلف:I','زلف','I','زَلَفَ','lazim',NULL,'to draw near, advance forward','تقدّم ودنا',NULL,1,'live'),
('VG:زلف:IV','زلف','IV','أَزْلَفَ','mutaaddi','(هـ)','to bring (a thing) near','قرّب الشيءَ','QR:26:90',2,'live'),
('VG:زلف:VIII','زلف','VIII','اِزْدَلَفَ','lazim','إلى','to draw near to (whence Muzdalifa)','اقترب إلى',NULL,3,'live'),
('VG:زلف:V','زلف','V','تَزَلَّفَ','lazim','إلى','to seek nearness to','تقرّب إلى',NULL,4,'live'),
('VG:خلص:I','خلص','I','خَلَصَ','lazim',NULL,'to become pure / unmixed','صار خالصًا',NULL,1,'live'),
('VG:خلص:I-ila','خلص','I','خَلَصَ','lazim','إلى','to reach, arrive at','وصل إلى',NULL,2,'live'),
('VG:خلص:I-min','خلص','I','خَلَصَ','lazim','مِن','to be freed / escape from','نجا من',NULL,3,'live'),
('VG:خلص:IV','خلص','IV','أَخْلَصَ','mutaaddi','(الدينَ) لـ','to devote (religion) exclusively to','أفرد الدينَ لـ','QR:39:2',4,'live'),
('VG:خلص:IV-li','خلص','IV','أَخْلَصَ','mutaaddi','لـ','to be sincere / loyal to','أخلص لـ',NULL,5,'live'),
('VG:خلص:II','خلص','II','خَلَّصَ','mutaaddi','(هـ) مِن','to rescue / set free from','أنقذ من',NULL,6,'live'),
('VG:خلص:V','خلص','V','تَخَلَّصَ','lazim','مِن','to get rid of, extricate from','تخلّص من',NULL,7,'live'),
('VG:خلص:X','خلص','X','اِسْتَخْلَصَ','mutaaddi','(هـ) لـ','to select exclusively for','استخصّ لـ','QR:12:54',8,'live');

INSERT OR REPLACE INTO ar_ling_root_antonyms (id, root_norm, antonym_ar, antonym_root, antonym_en, relation_kind, sort_order, status) VALUES
('AN:زلف:1','زلف','بُعْد','بعد','distance, remoteness','antonym',1,'live'),
('AN:زلف:2','زلف','قَصْوَى','قصو','the farthest point','antonym',2,'live'),
('AN:زلف:3','زلف','نَأْي','نأي','withdrawal, going far off','antonym',3,'live'),
('AN:خلص:1','خلص','شِرْك','شرك','association (of partners with God)','antonym',1,'live'),
('AN:خلص:2','خلص','رِياء','رأي','ostentation, showing off','antonym',2,'live'),
('AN:خلص:3','خلص','نِفاق','نفق','hypocrisy','antonym',3,'live'),
('AN:خلص:4','خلص','خَلْط','خلط','mixing, adulteration','contrast',4,'live');
