"""
Monkeypatch: Fix Pydantic v1 on Python 3.14+ (PEP 649 deferred annotations).

Python 3.14 defers annotation evaluation via PEP 649, so __annotations__
is empty during type.__new__. Pydantic v1's ModelMetaclass reads annotations
in __new__ and fails with "unable to infer type for attribute".

Fix: intercept ModelMetaclass.__new__ and eagerly evaluate annotations
via annotationlib before Pydantic v1 processes them.

Import this module before any pydantic.v1 BaseModel/BaseSettings subclass
is defined (e.g., before importing chromadb).
"""

import sys

if sys.version_info >= (3, 14):
    import warnings
    warnings.filterwarnings("ignore", message="Core Pydantic V1 functionality")

    import annotationlib
    from pydantic.v1 import main as _pv1_main

    _orig_new = _pv1_main.ModelMetaclass.__new__

    def _patched_new(mcs, name, bases, namespace, **kwargs):
        if "__annotations__" not in namespace or not namespace.get("__annotations__"):
            annotate_fn = annotationlib.get_annotate_from_class_namespace(namespace)
            if annotate_fn:
                try:
                    namespace["__annotations__"] = annotationlib.call_annotate_function(
                        annotate_fn, annotationlib.Format.VALUE
                    )
                except Exception:
                    pass
        return _orig_new(mcs, name, bases, namespace, **kwargs)

    _pv1_main.ModelMetaclass.__new__ = _patched_new
