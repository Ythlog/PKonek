"""Reserved barangay accountability query until the shared schema has barangay_id."""


def barangay_accountability(*args, **kwargs):
    """Once Person 2 adds ``complaints.barangay_id``, aggregate complaints by barangay.

    The eventual read-only query should group complaint totals, average first-response
    hours, SLA compliance, and verified-resolution rate by barangay, using joins to
    status history and citizen verification verdicts. Do not create a barangays table
    or alter shared schema from this package.
    """
    raise NotImplementedError("barangay_id is not present in the shared schema")
