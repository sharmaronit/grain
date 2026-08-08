const fs = require('fs');
const path = require('path');

const servicePath = path.join(__dirname, 'android', 'app', 'src', 'main', 'java', 'com', 'dailyclone', 'app', 'GrainWallpaperService.java');
let serviceContent = fs.readFileSync(servicePath, 'utf8');

// Add imports
serviceContent = serviceContent.replace('import java.util.Calendar;', 'import java.util.Calendar;\nimport android.content.BroadcastReceiver;\nimport android.content.Intent;\nimport android.content.IntentFilter;\nimport android.graphics.Bitmap;\nimport android.util.DisplayMetrics;');

// Remove generateDemoData call and replace with "Nothing to show" or just clear. 
serviceContent = serviceContent.replace(
`            if (heatmap == null) {
                generateDemoData();
            }`, 
`            if (heatmap == null) {
                // generateDemoData(); // Removed demo data fallback
            }`);

// Extract the theme class out or keep it inside.
// To keep it simple, we can just copy the drawing logic from draw() to a static method.
const staticMethod = `
    public static void drawHeatmapToCanvas(Context context, Canvas canvas, int width, int height, String dataStr) {
        String currentThemeKey = "amoled";
        int previewWeeks = 26;
        int currentStreak = 0;
        int completionRate = 0;
        int[][] heatmap = null;

        if (dataStr != null) {
            try {
                JSONObject obj = new JSONObject(dataStr);
                currentThemeKey = obj.optString("theme", "amoled");
                previewWeeks = Math.max(12, Math.min(52, obj.optInt("previewWeeks", 26)));
                currentStreak = obj.optInt("currentStreak", 0);
                completionRate = obj.optInt("completionRate", 0);

                JSONArray arr = obj.optJSONArray("heatmap");
                if (arr != null) {
                    int cols = arr.length();
                    heatmap = new int[cols][7];
                    for (int i = 0; i < cols; i++) {
                        JSONArray colArr = arr.optJSONArray(i);
                        if (colArr != null) {
                            for (int j = 0; j < Math.min(colArr.length(), 7); j++) {
                                heatmap[i][j] = colArr.optInt(j, 0);
                            }
                        }
                    }
                }
            } catch (JSONException e) {
                e.printStackTrace();
            }
        }

        int bgColor = Color.parseColor("#000000");
        int fgColor = Color.parseColor("#FFFFFF");
        int fgSoftColor = Color.parseColor("#CCFFFFFF");
        int accentColor = Color.parseColor("#22C55E");
        int[] intensityColors = new int[]{
                Color.parseColor("#2A2A2A"),
                Color.parseColor("#3F3F46"),
                Color.parseColor("#166534"),
                Color.parseColor("#22C55E")
        };

        if ("mono".equals(currentThemeKey)) {
            bgColor = Color.parseColor("#E9E9EA");
            fgColor = Color.parseColor("#111111");
            fgSoftColor = Color.parseColor("#BF111111");
            accentColor = Color.parseColor("#059669");
            intensityColors = new int[]{
                    Color.parseColor("#D4D4D8"),
                    Color.parseColor("#A1A1AA"),
                    Color.parseColor("#059669"),
                    Color.parseColor("#16A34A")
            };
        } else if ("slate".equals(currentThemeKey)) {
            bgColor = Color.parseColor("#1F2937");
            fgColor = Color.parseColor("#E5E7EB");
            fgSoftColor = Color.parseColor("#BFE5E7EB");
            accentColor = Color.parseColor("#38BDF8");
            intensityColors = new int[]{
                    Color.parseColor("#334155"),
                    Color.parseColor("#475569"),
                    Color.parseColor("#38BDF8"),
                    Color.parseColor("#7DD3FC")
            };
        } else if ("neon".equals(currentThemeKey)) {
            bgColor = Color.parseColor("#11052C");
            fgColor = Color.parseColor("#FFFFFF");
            fgSoftColor = Color.parseColor("#CCFFFFFF");
            accentColor = Color.parseColor("#F472B6");
            intensityColors = new int[]{
                    Color.argb(40, 255, 255, 255),
                    Color.argb(90, 255, 255, 255),
                    Color.parseColor("#F472B6"),
                    Color.parseColor("#22D3EE")
            };
        }

        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        Paint textPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        Paint pillPaint = new Paint(Paint.ANTI_ALIAS_FLAG);

        if ("neon".equals(currentThemeKey)) {
            LinearGradient shader = new LinearGradient(
                    0, 0, width, height,
                    new int[]{Color.parseColor("#EC4899"), Color.parseColor("#8B5CF6"), Color.parseColor("#06B6D4")},
                    null, Shader.TileMode.CLAMP
            );
            paint.setShader(shader);
            canvas.drawRect(0, 0, width, height, paint);
            paint.setShader(null);
        } else {
            canvas.drawColor(bgColor);
        }

        if (heatmap != null && heatmap.length > 0) {
            int colsToDraw = Math.min(previewWeeks, heatmap.length);
            int startCol = Math.max(0, heatmap.length - colsToDraw);

            float density = context.getResources().getDisplayMetrics().density;
            float padding = 24f * density;
            float gap = colsToDraw > 40 ? 2f * density : 3f * density;

            float availableWidth = width - (padding * 2);
            float totalGapWidth = (colsToDraw - 1) * gap;
            float sqSize = (availableWidth - totalGapWidth) / colsToDraw;
            if (sqSize > 24f * density) sqSize = 24f * density;

            float gridWidth = (colsToDraw * sqSize) + totalGapWidth;
            float gridHeight = (7 * sqSize) + (6 * gap);

            float startY = (height * 0.54f) - (gridHeight / 2f);
            float startX = (width - gridWidth) / 2f;

            Calendar cal = Calendar.getInstance();
            int dayOfWeek = cal.get(Calendar.DAY_OF_WEEK);
            int todayRow = (dayOfWeek + 5) % 7;
            int todayColIdx = colsToDraw - 1;

            for (int i = 0; i < colsToDraw; i++) {
                int actualCol = startCol + i;
                float x = startX + (i * (sqSize + gap));
                for (int j = 0; j < 7; j++) {
                    float y = startY + (j * (sqSize + gap));

                    int intensity = heatmap[actualCol][j];
                    if (intensity < 0) intensity = 0;
                    if (intensity > 3) intensity = 3;

                    boolean isToday = (i == todayColIdx && j == todayRow);

                    paint.setColor(intensityColors[intensity]);

                    if (intensity >= 2 && !"mono".equals(currentThemeKey)) {
                        paint.setShadowLayer(6f * density, 0, 0, intensityColors[intensity]);
                    } else {
                        paint.clearShadowLayer();
                    }

                    RectF rect = new RectF(x, y, x + sqSize, y + sqSize);
                    float cornerRadius = Math.max(2f * density, sqSize * 0.2f);
                    canvas.drawRoundRect(rect, cornerRadius, cornerRadius, paint);

                    if (isToday) {
                        paint.clearShadowLayer();
                        paint.setColor(accentColor);
                        float dotRadius = sqSize * 0.25f;
                        canvas.drawCircle(rect.centerX(), rect.centerY(), dotRadius, paint);
                    }
                }
            }
            paint.clearShadowLayer();

            String statsText = currentStreak + " DAY STREAK  ·  " + completionRate + "%";
            textPaint.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.BOLD));
            textPaint.setTextSize(12f * density);
            textPaint.setColor(fgColor);
            textPaint.setTextAlign(Paint.Align.CENTER);
            textPaint.setAntiAlias(true);
            textPaint.setSubpixelText(true);

            float textWidth = textPaint.measureText(statsText);
            float pillPaddingH = 14f * density;
            float pillPaddingV = 7f * density;
            float pillWidth = textWidth + (pillPaddingH * 2);
            float pillHeight = (textPaint.getTextSize()) + (pillPaddingV * 2);
            float pillY = startY + gridHeight + (24f * density);
            float pillX = (width - pillWidth) / 2f;

            int pillBg = "mono".equals(currentThemeKey)
                    ? Color.parseColor("#15000000")
                    : Color.parseColor("#26FFFFFF");
            pillPaint.setColor(pillBg);
            RectF pillRect = new RectF(pillX, pillY, pillX + pillWidth, pillY + pillHeight);
            canvas.drawRoundRect(pillRect, pillHeight / 2f, pillHeight / 2f, pillPaint);

            float textY = pillY + pillPaddingV + (textPaint.getTextSize() * 0.82f);
            canvas.drawText(statsText, width / 2f, textY, textPaint);
        }
    }
`;

// Replace draw() to use the static method
const drawReplacement = `
        private void draw() {
            SurfaceHolder holder = getSurfaceHolder();
            Canvas canvas = null;
            try {
                canvas = holder.lockCanvas();
                if (canvas != null) {
                    SharedPreferences prefs = getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
                    String dataStr = prefs.getString("GRAIN_LIVE_DATA", null);
                    drawHeatmapToCanvas(getBaseContext(), canvas, canvas.getWidth(), canvas.getHeight(), dataStr);
                }
            } finally {
                if (canvas != null) {
                    holder.unlockCanvasAndPost(canvas);
                }
            }
        }
`;
// Cut out the old draw() method (it's huge, from `private void draw() {` to `} finally { ... } }`)
const drawStartIndex = serviceContent.indexOf('private void draw() {');
const drawEndIndex = serviceContent.indexOf('        }', serviceContent.indexOf('unlockCanvasAndPost(canvas);')) + 9;

serviceContent = serviceContent.substring(0, drawStartIndex) + drawReplacement + staticMethod + serviceContent.substring(drawEndIndex);

// Add ACTION_TIME_TICK broadcast receiver
const receiverDecl = `
        private final BroadcastReceiver timeTickReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if (Intent.ACTION_TIME_TICK.equals(intent.getAction()) || Intent.ACTION_TIME_CHANGED.equals(intent.getAction()) || Intent.ACTION_TIMEZONE_CHANGED.equals(intent.getAction())) {
                    if (visible) {
                        handler.post(drawRunner);
                    }
                }
            }
        };
`;
serviceContent = serviceContent.replace('private final Runnable drawRunner', receiverDecl + '\n        private final Runnable drawRunner');
serviceContent = serviceContent.replace('loadPreferences();\n        }', 'loadPreferences();\n            IntentFilter filter = new IntentFilter();\n            filter.addAction(Intent.ACTION_TIME_TICK);\n            filter.addAction(Intent.ACTION_TIME_CHANGED);\n            filter.addAction(Intent.ACTION_TIMEZONE_CHANGED);\n            registerReceiver(timeTickReceiver, filter);\n        }');
serviceContent = serviceContent.replace('handler.removeCallbacks(drawRunner);\n        }', 'handler.removeCallbacks(drawRunner);\n            unregisterReceiver(timeTickReceiver);\n        }');

fs.writeFileSync(servicePath, serviceContent, 'utf8');
console.log('Fixed GrainWallpaperService');
