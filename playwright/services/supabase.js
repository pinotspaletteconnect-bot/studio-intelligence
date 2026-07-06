async function upsertEulerityMetrics(rows) {

    const { error } = await supabase
        .from("eulerity_daily_metrics")
        .upsert(rows, {
            onConflict: "studio_id,report_date"
        });

    if (error) {
        throw error;
    }

    return rows.length;
}