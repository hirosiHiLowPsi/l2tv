L2TV User Guide / Safety Notes
==============================

Important Notice: Uninstalling and Using the 7z Version
-------------------------------------------------------

- Extracting the 7z archive automatically creates an "L2TV" folder containing all application files. You do not need to create an empty folder first.
- Launch L2TV.exe inside the extracted "L2TV" folder.
- The 7z version does not need installation. To remove it, do not use the Windows uninstaller. Move the extracted dedicated L2TV folder to the Recycle Bin instead.
- Only delete the dedicated L2TV folder you extracted. Do not delete parent folders such as Desktop or Downloads.
- If you installed version 1.0.1 or earlier directly into a personal folder such as Desktop, do not run the uninstaller.

L2TV stands for "LR2 Table Viewer".
It reads local Lunatic Rave 2 databases and BMS difficulty tables so you can
check clear lamps, scores, BP, rival comparisons, and update history.

This tool is only for viewing LR2 data.
It does not modify or delete score.db, song.db, or Rival DB files.


1. What This Tool Can Do
------------------------

Basic features:

- Load an LR2 score.db.
- Load an LR2 song.db.
- Load the LR2 Rival folder.
- Choose the score.db mode: Auto Detect, Legacy LR2IR Compatible, StellaverseIR, or BMS-IR.
- Show the player name.
- Show the SP grade.
- Show st/sl grades.
- Load difficulty tables and summarize only registered charts.
- Show Player Data even without loading a difficulty table.

Difficulty tables:

- Stella
- Satellite
- Insane BMS Table
- Overjoy
- Dystopia
- Tables selected from the table list
- Show / hide loaded difficulty tables
- Show loaded tables by table title instead of URL

Player Data:

- Player name
- ID
- FORCE RATE and title badge
- FORCE RATE matches chart constants from Insane BMS, first Overjoy, and second-period Overjoy by MD5
- Chart constants are score-focused and mainly based on the AAA achiever share among cleared players in LR2IR Archive
- Chart FORCE = Chart Constant × Score Coefficient
- Lamp coefficients and BEST20 correction are not used; FORCE RATE is the simple average of up to 51 targets: top 50 chart FORCE values plus the highest passed GENOSIDE2018 SP dan course
- Export the 51 FORCE RATE targets as a PNG image.
- The FORCE target image includes the current rating, title badge, previous-load change, and target IN/OUT lists.
- Show the FORCE RATE change since the previous load and charts entering (IN) or leaving (OUT) the target set.
- Hakkyou dan constants are based on the share of players who both passed the course and reached AAA among all players who played that course in LR2IR Archive
- Hakkyou dan courses also use a score coefficient when course EX score is available. GENOSIDE2018 Overjoy keeps full dan credit once passed.
- SP grade
- Official SP grade name
- st/sl grades
- Official st/sl grade names
- Special grade display such as Overjoy
- Rainbow animation for special grades such as st12 / Overjoy
- Key hit count for the current load
- Play time if score.db has a play time field

Lamp summary:

- CLEAR LAMP graph
- SCORE LAMP graph
- Horizontal bar graph by level
- Percentage labels inside graphs
- Lamp breakdown
- Score breakdown
- Lamp / score breakdown for each level folder
- Level folder coloring based on completion status

Chart list:

- Show chart lists by level
- Show Lv / Title / Artist / Lamp / Rank / EX/Rate / BP / Play Count / IR Rank / Rival
- Show Rank such as AAA / AA / A as a colored badge
- In Stellaverse IR mode, show IR rank and top percentage for ★, ★★, st, and sl charts.
- Each table shows counts for 1st, 2nd, 3rd, total Top 3, and 4th–10th placements.
- IR rank, IR status, and Stellaverse Rival currently support Stellaverse IR only. BMS-IR is supported only as a score.db format.
- IR rank and IR status can be toggled independently. When both are off, L2TV skips fetching the player's IR rankings.
- Lv is shown as a heading only
- Sort by Title, Artist, and other columns
- Center-align columns other than Title and Artist
- Show level labels with table symbols
- Color rows by clear lamp
- Use short lamp labels
- Show rival comparison
- Show BP
- NO PLAY charts show BP as NO Data
- Charts missing from song.db are shown as NS
- While a level folder is open, use the Folder Close button at the bottom to close it.
- While a level folder is open, use the Folder Option button to show a compact sort header.

Lamp Updates:

- Show charts whose clear lamp changed since the previous load.
- Optionally show charts whose BP decreased, regardless of clear lamp.
- Show charts with improved EX score in the Score Update section.
- Charts with lamp or BP updates are also shown in Score Update if their score improved.
- Export today's updates as an image.
- Show the key hit count for the current load.
- Show play time if score.db has a play time field.
- Show the number of updated charts.

RIVAL:

- Load the LR2 Rival folder.
- Fetch public scores by Stellaverse Rival ID without a Rival DB.
- Compare Stellaverse IR rivals and local Rival DB players together.
- Show the Stellaverse rival's SP grade, FORCE RATE, title, and badge.
- Compare clear lamps by rival.
- Compare score win/loss by rival.
- Show opponent score / rate / lamp in the Rival column of the chart list.
- Show WIN / LOSE counts by rival.
- Show WIN / LOSE rates as a yellow / blue graph.
- NO PLAY is not counted as a loss.
- Choose comparison targets with checkboxes.
- Select All / Clear All.
- Switch win/loss scope between all charts and each difficulty table.
- Sort rivals by win rate, loss rate, or name.
- When IR is rarely used, hide chart-list IR ranks and table IR status independently from the menu.

Image export:

- Export today's updates.
- Export difficulty table summaries.
- Export FORCE RATE target lists.
- Export CLEAR LAMP / SCORE LAMP graphs.
- Choose any screenshot save folder.
- Show "Screenshot saved!" when saving is complete.

Display settings:

- Switch system language between Japanese and English.
- Light Aqua theme
- Geek Dark theme
- One-click CLEAR LAMP / SCORE LAMP switching


2. Requirements
---------------

- Windows PC
- Lunatic Rave 2
- LR2 score.db
- LR2 song.db

Useful optional items:

- LR2 Rival folder
- Difficulty table URLs you want to load

Common locations:

score.db:
  LR2files\Database\Score\PlayerName.db

song.db:
  LR2files\Database\song.db

Rival folder:
  LR2files\Rival

Locations differ by environment.
If you are unsure, look for LR2files inside your LR2 folder.


3. Starting the App
-------------------

7z version:

1. Extract L2TV-2.1.0-win-x64.7z to any location.
2. Run L2TV.exe inside the automatically created "L2TV" folder.
3. Installation is not required.

4. First Use
------------

1. Start L2TV.
2. Open Menu from the upper right.
3. Choose score.db from Browse next to LR2 score.db Path.
4. Choose song.db from Browse next to song.db Path.
5. If needed, choose the Rival folder from Browse next to Rival Folder.
6. Open the difficulty table list with Open List and check the tables you want to load.
7. Press Load Tables and Lamps.

Even if no difficulty table is selected, Player Data can still be shown.


5. Menu Settings
----------------

Load settings:

- Set score.db.
- Set song.db.
- Set the screenshot save folder.
- Set the Rival folder.
- Open the difficulty table list in a separate window.
- Select the tables to load from the list.
- Filter the table list by General / Personal / Self-made Chart Only.

Display settings:

- Choose the display language from Japanese / English.
- On first launch, a message asks you to choose the display language.
- Choose the theme from Light Aqua / Geek Dark.
- Choose whether BP updates are included in Lamp Updates.

Saved data:

- Entered paths and settings are saved and restored next time.
- score.db, song.db, and Rival folder paths are carried over to the next launch.


6. Difficulty Tables
--------------------

Open the difficulty table list, and checked tables are loaded.
Use Refresh List to fetch the latest list.
Use search and the General / Personal / Self-made Chart Only tag filters to find the tables you need.
After loading, tables are displayed by table title instead of URL.


7. How to Read the Display
--------------------------

Player Data:
  Shows player name, ID, SP grade, st/sl grades, and related data.
  GENOSIDE2018 grade course passes require NORMAL CLEAR or better.
  If LR2 stores a grade-course normal clear as clear=2 in score.db, L2TV treats it as a dan-course NORMAL CLEAR.
  GENOSIDE2018 SP dan, Stella Skill Simulator 4th, and Satellite Skill Analyzer 2nd also use bundled course hashes extracted from lr2crs files as fallback match data.
  Grade passes are determined only from the grade course clear record stored in score.db. Clear lamps for the individual songs in the course are ignored.
  Grades are estimated offline from score.db and song.db. L2TV does not supplement grade data from IR profile pages.

Lamp Breakdown:
  Shows clear lamp counts for the whole difficulty table.

Score Breakdown:
  Shows counts for AAA / AA / A / B / C / D / E / F / NP / NS.
  NO PLAY charts are not counted as F; they are treated as NP.

CLEAR LAMP:
  Shows FC / HC / NC / EC / FL / NP / NS rates by level.

SCORE LAMP:
  Shows AAA / AA / A / B / C / D / E / F / NP / NS rates by level.

Chart List:
  Open a level to check each chart in detail.

Rank:
  Shows score rank such as AAA / AA / A in the chart list.

BP:
  BAD + POOR total. NO PLAY charts show NO Data.

NS:
  Short for NO SONG. This means song data was not found in song.db.

Folder Option:
  Appears only while a level folder is open.
  Press it to show a compact sort header.
  While it is shown, the button text changes to Option Close.

Folder Close:
  Appears only while a level folder is open.
  Press it to close the open level folder.

Lamp Updates:
  Shows updates compared with the previous load.
  Turn on "Include updated charts outside loaded tables" in Menu to include charts outside the currently loaded tables.
  Unlisted charts are compared against the local score state saved at the previous load.

RIVAL:
  Shows score win/loss against loaded rivals.


8. RIVAL Feature
----------------

Open the rival menu with the RIVAL button.

Available actions:

- Show loaded rivals.
- Show score counts by rival.
- Turn comparison targets ON/OFF with checkboxes.
- Select All.
- Clear All.
- Show WIN / LOSE counts.
- Show WIN / LOSE rates as a graph.
- Switch win/loss scope between all charts and each difficulty table.
- Sort by win rate, loss rate, or name.

Win/loss judgment:

- If your EX score is higher, it is WIN.
- If your EX score is lower, it is LOSE.
- Equal score is shown as DRAW.
- If you or the rival is NO PLAY / NO SONG, it is not counted.

Rival column in the chart list:

- Background color based on the rival lamp.
- WIN / LOSE / DRAW.
- Rival name.
- Rival EX score.
- Rival score rate.
- Rival lamp.


9. Lamp Updates
----------------

Lamp Updates compares the previous load with the current load.

Shown updates:

- Charts whose clear lamp improved.
- Charts whose BP decreased.
- Charts whose EX score improved.

BP Update:
  Turn on "Include charts with lower BP in Lamp Updates" from Menu to show this.

Score Update:
  Shows charts whose EX score improved, separately from lamp and BP updates.
  Charts that improved score at the same time as a lamp update are also shown here.

Image export:
  Use "Export Today's Updates" in Lamp Updates.


10. Image Export
----------------

Today's update image:

- Use "Export Today's Updates" in Lamp Updates.
- Exports lamp updates, BP updates, and score updates.
- Also shows key hit count, play time, and number of updated charts.
- If there are many updated charts, the export is automatically split into multiple PNG files, 250 charts per image.

Difficulty table summary image:

- Export from each difficulty table summary.
- Exports Lamp Breakdown, Score Breakdown, and CLEAR LAMP / SCORE LAMP graphs.

FORCE RATE target list image:

- Export from "Export FORCE Targets" in FORCE RATE TARGETS.
- Exports up to 51 targets as one PNG using the current sort order.

Save folder:

- You can choose it from Screenshot Folder in Menu.
- If blank, images are saved to L2TV's default screenshot folder.

Format:

- PNG

File names:

- Today's updates
  L2TV_Today_yyyymmddhhmmss.png

- Difficulty table summary
  L2TV_Table_TableSymbol_yyyymmddhhmmss.png

- FORCE RATE target list
  L2TV_FORCE_Targets_yyyymmddhhmmss.png

If a file with the same name already exists:

- It is not overwritten. A number is added to the end of the filename.

Save complete:

- "Screenshot saved!" is shown.


11. Saved Data
--------------

L2TV saves the following information so it can be used immediately next time:

- score.db path
- song.db path
- Rival folder path
- Screenshot save folder
- Selected difficulty table URLs
- Selected display language
- Selected theme
- Whether BP updates are included in Lamp Updates
- Previous load result

How to clear saved data:

1. Open Menu.
2. Press Clear Saved Data.

Only L2TV's saved app data is deleted.
LR2 score.db, song.db, and Rival DB files are not deleted.


12. Automatic Reload
--------------------

If the previously loaded score.db / song.db has changed,
L2TV can detect the update and reload on the next launch or load.

This makes it easier to open L2TV after playing LR2 and check new lamps,
BP updates, score updates, and related changes.


13. Themes
----------

Light Aqua:
  A bright aqua-based theme.

Geek Dark:
  A dark, black-based theme.

You can switch themes from Menu.


14. Safety
----------

L2TV reads LR2 score.db, song.db, and Rival DB files,
but it does not write to DB files.

Confirmed safety points:

- score.db, song.db, and Rival DB are handled as read-only.
- SQL writes such as UPDATE / DELETE / DROP TABLE are not executed against LR2 DB files.
- There is no process that deletes LR2 folders or DB files.
- There is no process that moves, renames, or overwrites LR2 DB files.
- There is no process that executes arbitrary external commands.
- Images are not saved outside the user-selected screenshot folder without permission.
- Existing image files are not overwritten.
- Dangerous characters are removed from image filenames before saving.
- The local API is restricted so external sites cannot easily use it without permission.
- Dangerous Electron features are disabled.
- There is no feature that uploads score.db, song.db, or Rival DB to the outside.

In short, L2TV is a tool for viewing LR2 data,
not for changing or deleting LR2 score data.


15. Network Access
------------------

L2TV may connect to the internet to load the table list and difficulty table data.

Examples:

- Difficulty table list
- Selected difficulty table URLs

Data that is not sent:

- score.db
- song.db
- Rival DB
- LR2 player data
- Contents of local DB files

DB contents are read and displayed on the local PC.


16. Windows Warnings
--------------------

Personal, unsigned apps may trigger warnings from Windows SmartScreen
or antivirus software.

This does not mean the app has dangerous behavior.
It is a common warning for apps with little signing or distribution history.

If you are unsure, confirm the distribution source before running it.


17. Updating
------------

7z version:

1. Close L2TV.
2. Extract the new L2TV-2.1.0-win-x64.7z.
3. Replace the old L2TV folder with the new one.

Notes:

- Close L2TV before updating.
- LR2 score.db / song.db are not part of the update process.


18. Uninstalling
----------------

Important note for legacy installer versions:

- If you installed version 1.0.1 or earlier directly into a personal folder such as Desktop, do not run the uninstaller.

7z version:

1. Delete the L2TV folder.
   Do not use Windows uninstall for the 7z version.

If you also want to delete saved app data:

1. Start L2TV before uninstalling.
2. Open Menu.
3. Press Clear Saved Data.
4. Then uninstall the app.


19. FAQ
-------

Q. Can I use it without an internet connection?
A. You can view previously saved settings and local DB data. Loading the table list or new difficulty table data requires an internet connection.

Q. Can score.db or song.db be modified?
A. No. They are handled as read-only.

Q. Can Rival DB be modified?
A. No. Rival information is also handled as read-only.

Q. Can I use it without loading a difficulty table?
A. Yes. You can show Player Data only.

Q. Is song.db required?
A. Some features can be shown with score.db only, but chart matching, grades,
NO SONG detection, and related features are more accurate with song.db.

Q. Is the Rival folder required?
A. No. Set it only if you want rival comparison.

Q. Where are images saved?
A. They are saved to the folder selected in Screenshot Folder. If blank, the default screenshot folder is used.

Q. Can I post exported images to streams or social media?
A. Images may include player names, rival names, and updated charts. Check that they do not contain information you do not want to publish.

Q. What happens when I choose a table from the table list?
A. L2TV fetches the selected table data and matches it against local DB chart information. score.db / song.db are not uploaded.

Q. What is NS?
A. NS means NO SONG. It is a chart that exists in the difficulty table but was not found in the loaded song.db.

Q. What is BP Update?
A. A chart whose BP decreased compared with the previous load. It can be included in Lamp Updates by turning on the option.

Q. What is Score Update?
A. A chart whose EX score improved compared with the previous load. It is shown in the Score Update section separately from lamp and BP updates.

Q. What is Rank?
A. The score grade such as AAA / AA / A calculated from EX score rate.

Q. What is Folder Option?
A. A compact option display for the open level folder. It can show the sort header.


20. Version
-----------

L2TV 1.0.6
